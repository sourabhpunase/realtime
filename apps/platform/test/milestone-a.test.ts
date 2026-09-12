import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { io as ioc, type Socket } from "socket.io-client";
import { expandRolePreset } from "@realtime/protocol";
import { createPlatform } from "../src/createPlatform.js";
import { MemoryStore } from "../src/store.js";
import { newKeyPair } from "../src/lib.js";

async function identify(
  baseUrl: string,
  secretKey: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${baseUrl}/v1/tokens`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { response, json: await response.json() };
}

function connect(baseUrl: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioc(baseUrl, {
      auth: { token },
      transports: ["websocket"],
      forceNew: true,
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (error) => reject(error));
  });
}

describe("Milestone A — secure external auth", () => {
  const store = new MemoryStore();
  const tenant = store.createTenant("Acme");
  const appA = store.createApplication(tenant.id, "Notes", "development");
  const appB = store.createApplication(tenant.id, "Wiki", "development");
  const keysA = newKeyPair("development");
  const keysB = newKeyPair("development");
  store.addCredential(appA.id, keysA.publicKey, keysA.secretKey);
  store.addCredential(appB.id, keysB.publicKey, keysB.secretKey);

  let platform: Awaited<ReturnType<typeof createPlatform>>;
  let baseUrl: string;

  before(async () => {
    platform = await createPlatform({
      store,
      signingSeed: "test-signing-seed",
      corsOrigins: ["http://localhost:0"],
      revocationPollMs: 200,
    });
    const port = await platform.listen(0);
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await platform.close();
  });

  it("lets an integrator-authenticated user join without a platform account", async () => {
    const { response, json } = await identify(baseUrl, keysA.secretKey, {
      user: { id: "alice-ext", name: "Alice" },
      room: "doc:welcome",
      permissions: expandRolePreset("editor"),
    });
    assert.equal(response.status, 200);
    assert.ok(json.token);
    assert.equal(json.user.id, "alice-ext");
    assert.ok(json.expiresIn <= 3600);
    assert.ok(json.expiresIn >= 60);

    const socket = await connect(baseUrl, json.token);
    const users = await new Promise<unknown[]>((resolve, reject) => {
      socket.emit("join-room", { roomId: "doc:welcome", protocol: 1 }, (ack: { ok: boolean; users?: unknown[]; error?: { message: string } }) => {
        if (!ack.ok) reject(new Error(ack.error?.message));
        else resolve(ack.users ?? []);
      });
    });
    assert.equal(users.length, 1);
    socket.disconnect();
  });

  it("isolates identical external room ids across applications", async () => {
    const a = await identify(baseUrl, keysA.secretKey, {
      user: { id: "same-user", name: "Same" },
      room: "shared-name",
      permissions: expandRolePreset("editor"),
    });
    const b = await identify(baseUrl, keysB.secretKey, {
      user: { id: "same-user", name: "Same" },
      room: "shared-name",
      permissions: expandRolePreset("editor"),
    });
    assert.notEqual(a.json.room.internalId, b.json.room.internalId);

    const socketA = await connect(baseUrl, a.json.token);
    const socketB = await connect(baseUrl, b.json.token);
    const seenOnA: string[] = [];
    socketA.on("user-joined", (user: { id: string }) => seenOnA.push(user.id));
    await new Promise<void>((resolve, reject) => {
      socketA.emit("join-room", { roomId: "shared-name", protocol: 1 }, (ack: { ok: boolean }) =>
        ack.ok ? resolve() : reject(),
      );
    });
    await new Promise<void>((resolve, reject) => {
      socketB.emit("join-room", { roomId: "shared-name", protocol: 1 }, (ack: { ok: boolean }) =>
        ack.ok ? resolve() : reject(),
      );
    });
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(seenOnA.length, 0);
    socketA.disconnect();
    socketB.disconnect();
  });

  it("rejects missing, forged, wrong-room, and viewer write attempts", async () => {
    await assert.rejects(() => connect(baseUrl, ""));
    await assert.rejects(() => connect(baseUrl, "not-a-jwt"));

    const editor = await identify(baseUrl, keysA.secretKey, {
      user: { id: "editor", name: "Editor" },
      room: "doc:secure",
      permissions: expandRolePreset("editor"),
    });
    const viewer = await identify(baseUrl, keysA.secretKey, {
      user: { id: "viewer", name: "Viewer" },
      room: "doc:secure",
      permissions: expandRolePreset("viewer"),
    });
    const otherRoom = await identify(baseUrl, keysA.secretKey, {
      user: { id: "editor", name: "Editor" },
      room: "doc:other",
      permissions: expandRolePreset("editor"),
    });

    const wrong = await connect(baseUrl, otherRoom.json.token);
    const wrongAck = await new Promise<{ ok: boolean; error?: { code: string } }>((resolve) => {
      wrong.emit("join-room", { roomId: "doc:secure", protocol: 1 }, resolve);
    });
    assert.equal(wrongAck.ok, false);
    assert.equal(wrongAck.error?.code, "WRONG_ROOM");
    wrong.disconnect();

    const viewerSock = await connect(baseUrl, viewer.json.token);
    await new Promise<void>((resolve, reject) => {
      viewerSock.emit("join-room", { roomId: "doc:secure", protocol: 1 }, (ack: { ok: boolean }) =>
        ack.ok ? resolve() : reject(),
      );
    });
    const error = await new Promise<{ code: string }>((resolve) => {
      viewerSock.on("room:error", resolve);
      viewerSock.emit("cursor-move", { x: 0.2, y: 0.3, surface: "collaboration" });
    });
    assert.equal(error.code, "FORBIDDEN");
    viewerSock.disconnect();

    const rest = await fetch(`${baseUrl}/v1/rooms/doc:secure`, {
      headers: { authorization: `Bearer ${viewer.json.token}` },
    });
    assert.equal(rest.status, 200);

    const editorSock = await connect(baseUrl, editor.json.token);
    const yjs = await new Promise<{ ok: boolean }>((resolve) => {
      editorSock.emit("yjs:update", { update: "nope" }, resolve);
    });
    assert.equal(yjs.ok, false);
    editorSock.disconnect();
  });

  it("keeps application identity when rotating keys and blocks revoked secrets", async () => {
    const rotated = newKeyPair("development");
    const created = store.addCredential(appA.id, rotated.publicKey, rotated.secretKey);
    const first = await identify(baseUrl, keysA.secretKey, {
      user: { id: "rot", name: "Rot" },
      room: "doc:rotate",
      permissions: expandRolePreset("editor"),
    });
    assert.equal(first.response.status, 200);
    store.revokeCredential(
      [...store.credentials.values()].find((item) => item.publicKey === keysA.publicKey)!.id,
    );
    const denied = await identify(baseUrl, keysA.secretKey, {
      user: { id: "rot", name: "Rot" },
      room: "doc:rotate",
      permissions: expandRolePreset("editor"),
    });
    assert.equal(denied.response.status, 401);
    const next = await identify(baseUrl, rotated.secretKey, {
      user: { id: "rot", name: "Rot" },
      room: "doc:rotate",
      permissions: expandRolePreset("editor"),
    });
    assert.equal(next.response.status, 200);
    assert.equal(next.json.room.internalId, first.json.room.internalId);
    void created;
  });

  it("disconnects a revoked session", async () => {
    const issued = await identify(baseUrl, keysB.secretKey, {
      user: { id: "doomed", name: "Doomed" },
      room: "doc:revoke",
      permissions: expandRolePreset("editor"),
    });
    const socket = await connect(baseUrl, issued.json.token);
    await new Promise<void>((resolve, reject) => {
      socket.emit("join-room", { roomId: "doc:revoke", protocol: 1 }, (ack: { ok: boolean }) =>
        ack.ok ? resolve() : reject(),
      );
    });
    const dropped = new Promise<void>((resolve) => socket.on("disconnect", () => resolve()));
    await fetch(`${baseUrl}/v1/rooms/doc:revoke/revoke`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${keysB.secretKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ userId: "doomed" }),
    });
    await dropped;
  });
});
