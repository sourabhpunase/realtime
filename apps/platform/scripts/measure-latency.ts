import { writeFile } from "node:fs/promises";
import os from "node:os";
import { io as ioc, type Socket } from "socket.io-client";
import * as Y from "yjs";
import { expandRolePreset } from "@realtime/protocol";
import { createPlatform } from "../src/createPlatform.js";
import { newKeyPair } from "../src/lib.js";
import { MemoryStore } from "../src/store.js";

const ITERATIONS = 40;

type Sample = {
  identifyMs: number;
  joinMs: number;
  syncMs: number;
  updateMs: number;
};

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

async function identify(baseUrl: string, secret: string, body: Record<string, unknown>) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}/v1/tokens`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message ?? "identify failed");
  return { token: json.token as string, ms: performance.now() - started };
}

function connect(baseUrl: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioc(baseUrl, { auth: { token }, transports: ["websocket"], forceNew: true });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });
}

async function join(socket: Socket, roomId: string): Promise<number> {
  const started = performance.now();
  await new Promise<void>((resolve, reject) => {
    socket.emit("join-room", { roomId, protocol: 1 }, (ack: { ok: boolean; error?: { message: string } }) =>
      ack.ok ? resolve() : reject(new Error(ack.error?.message ?? "join failed")),
    );
  });
  return performance.now() - started;
}

async function sync(socket: Socket): Promise<number> {
  const started = performance.now();
  await new Promise<void>((resolve, reject) => {
    socket.emit("yjs:sync", {}, (ack: { ok: boolean }) => (ack.ok ? resolve() : reject(new Error("sync failed"))));
  });
  return performance.now() - started;
}

async function update(socket: Socket, generation: number, n: number): Promise<number> {
  const doc = new Y.Doc();
  doc.getText("content").insert(0, `ping-${n}`);
  const started = performance.now();
  await new Promise<void>((resolve, reject) => {
    socket.emit(
      "yjs:update",
      {
        update: Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64"),
        generation,
        requestId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
      },
      (ack: { ok: boolean }) => (ack.ok ? resolve() : reject(new Error("update failed"))),
    );
  });
  return performance.now() - started;
}

async function main(): Promise<void> {
  const store = new MemoryStore();
  const tenant = store.createTenant("Bench");
  const application = store.createApplication(tenant.id, "Latency", "development");
  const keys = newKeyPair("development");
  store.addCredential(application.id, keys.publicKey, keys.secretKey);

  const platform = await createPlatform({ store, signingSeed: "latency-bench" });
  const baseUrl = `http://127.0.0.1:${await platform.listen(0)}`;

  const samples: Sample[] = [];
  try {
    for (let i = 0; i < ITERATIONS + 5; i += 1) {
      const issued = await identify(baseUrl, keys.secretKey, {
        user: { id: `bench-${i}`, name: "Bench" },
        room: "doc:latency",
        permissions: expandRolePreset("editor"),
      });
      const socket = await connect(baseUrl, issued.token);
      const joinMs = await join(socket, "doc:latency");
      const syncMs = await sync(socket);
      const generation = await new Promise<number>((resolve, reject) => {
        socket.emit("yjs:sync", {}, (ack: { ok: boolean; generation?: number }) =>
          ack.ok && ack.generation != null ? resolve(ack.generation) : reject(new Error("generation")),
        );
      });
      const updateMs = await update(socket, generation, i);
      socket.disconnect();
      if (i >= 5) {
        samples.push({ identifyMs: issued.ms, joinMs, syncMs, updateMs });
      }
    }
  } finally {
    await platform.close();
  }

  const metrics = ["identifyMs", "joinMs", "syncMs", "updateMs"] as const;
  const stats = Object.fromEntries(
    metrics.map((key) => {
      const values = samples.map((sample) => sample[key]);
      return [
        key,
        {
          n: values.length,
          p50: round(percentile(values, 50)),
          p95: round(percentile(values, 95)),
          max: round(Math.max(...values)),
        },
      ];
    }),
  );

  const env = {
    date: new Date().toISOString(),
    node: process.version,
    platform: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    cpus: os.cpus()[0]?.model ?? "unknown",
    store: "memory",
    instance: "single",
    iterations: samples.length,
    warmup: 5,
    host: "127.0.0.1 loopback, in-process platform",
  };

  const markdown = `# Documented local latency

These numbers were measured on this machine. They are not a production SLO and do not include WAN, TLS, LiveKit, or a browser editor.

## Environment

| Field | Value |
|-------|--------|
| Date | ${env.date} |
| Node | ${env.node} |
| OS | ${env.platform} ${env.arch} |
| CPU | ${env.cpus} |
| Store | ${env.store} |
| Instance | ${env.instance} |
| Target | ${env.host} |
| Samples | ${env.iterations} (after ${env.warmup} warmup) |

## Results (ms)

| Operation | p50 | p95 | max |
|-----------|-----|-----|-----|
| \`POST /v1/tokens\` | ${stats.identifyMs.p50} | ${stats.identifyMs.p95} | ${stats.identifyMs.max} |
| Socket.IO \`join-room\` ack | ${stats.joinMs.p50} | ${stats.joinMs.p95} | ${stats.joinMs.max} |
| \`yjs:sync\` ack | ${stats.syncMs.p50} | ${stats.syncMs.p95} | ${stats.syncMs.max} |
| \`yjs:update\` persist-then-ack | ${stats.updateMs.p50} | ${stats.updateMs.p95} | ${stats.updateMs.max} |

Re-run with \`npm run bench:latency\`.
`;

  await writeFile(new URL("../../../docs/PERFORMANCE.md", import.meta.url), markdown);
  console.log(JSON.stringify({ env, stats }, null, 2));
  console.log("Wrote docs/PERFORMANCE.md");
}

void main();
