import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { io as ioc, type Socket } from "socket.io-client";
import * as Y from "yjs";
import { expandRolePreset } from "@realtime/protocol";
import { createPlatform } from "../src/createPlatform.js";
import { MemoryStore } from "../src/store.js";
import { newKeyPair } from "../src/lib.js";

async function identify(baseUrl: string, secret: string, body: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/v1/tokens`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { response, json: await response.json() };
}

function connect(baseUrl: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioc(baseUrl, { auth: { token }, transports: ["websocket"], forceNew: true });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });
}

async function join(socket: Socket, roomId: string) {
  await new Promise<void>((resolve, reject) => {
    socket.emit("join-room", { roomId, protocol: 1 }, (ack: { ok: boolean; error?: { message: string } }) =>
      ack.ok ? resolve() : reject(new Error(ack.error?.message)),
    );
  });
}

function encode(update: Uint8Array) {
  return Buffer.from(update).toString("base64");
}

function decode(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

describe("Milestone B — Yjs documents", () => {
  const store = new MemoryStore();
  const tenant = store.createTenant("Docs");
  const application = store.createApplication(tenant.id, "Notes", "development");
  const keys = newKeyPair("development");
  store.addCredential(application.id, keys.publicKey, keys.secretKey);

  let platform: Awaited<ReturnType<typeof createPlatform>>;
  let baseUrl: string;

  before(async () => {
    platform = await createPlatform({ store, signingSeed: "milestone-b", revocationPollMs: 500 });
    baseUrl = `http://127.0.0.1:${await platform.listen(0)}`;
  });

  after(async () => {
    await platform.close();
  });

  it("converges concurrent edits without whole-document overwrite", async () => {
    const aTok = await identify(baseUrl, keys.secretKey, {
      user: { id: "a", name: "A" },
      room: "doc:para",
      permissions: expandRolePreset("editor"),
    });
    const bTok = await identify(baseUrl, keys.secretKey, {
      user: { id: "b", name: "B" },
      room: "doc:para",
      permissions: expandRolePreset("editor"),
    });
    const socketA = await connect(baseUrl, aTok.json.token);
    const socketB = await connect(baseUrl, bTok.json.token);
    await join(socketA, "doc:para");
    await join(socketB, "doc:para");

    const docA = new Y.Doc();
    const docB = new Y.Doc();
    socketA.on("yjs:update", ({ update }: { update: string }) => {
      Y.applyUpdate(docA, decode(update));
    });
    socketB.on("yjs:update", ({ update }: { update: string }) => {
      Y.applyUpdate(docB, decode(update));
    });

    const syncA = await new Promise<{ update: string; serverStateVector: string; generation: number }>(
      (resolve, reject) => {
        socketA.emit("yjs:sync", {}, (ack: { ok: boolean } & Record<string, string | number>) =>
          ack.ok ? resolve(ack as never) : reject(),
        );
      },
    );
    Y.applyUpdate(docA, decode(syncA.update));
    const syncB = await new Promise<{ update: string; generation: number }>((resolve, reject) => {
      socketB.emit("yjs:sync", {}, (ack: { ok: boolean } & Record<string, string | number>) =>
        ack.ok ? resolve(ack as never) : reject(),
      );
    });
    Y.applyUpdate(docB, decode(syncB.update));

    docA.getText("content").insert(0, "alpha");
    docB.getText("content").insert(0, "beta");
    const updateA = Y.encodeStateAsUpdate(docA, decode(syncA.serverStateVector));
    const updateB = Y.encodeStateAsUpdate(docB, Y.encodeStateVector(new Y.Doc()));

    await new Promise<void>((resolve, reject) => {
      socketA.emit(
        "yjs:update",
        { update: encode(updateA), generation: syncA.generation, requestId: "11111111-1111-4111-8111-111111111111" },
        (ack: { ok: boolean }) => (ack.ok ? resolve() : reject()),
      );
    });
    await new Promise<void>((resolve, reject) => {
      socketB.emit(
        "yjs:update",
        { update: encode(Y.encodeStateAsUpdate(docB)), generation: syncB.generation, requestId: "22222222-2222-4222-8222-222222222222" },
        (ack: { ok: boolean }) => (ack.ok ? resolve() : reject()),
      );
    });
    void updateB;

    await new Promise((r) => setTimeout(r, 50));
    const resync = (socket: Socket, doc: Y.Doc) =>
      new Promise<void>((resolve, reject) => {
        socket.emit("yjs:sync", { stateVector: encode(Y.encodeStateVector(doc)) }, (ack: { ok: boolean; update?: string }) => {
          if (!ack.ok || !ack.update) return reject();
          Y.applyUpdate(doc, decode(ack.update));
          resolve();
        });
      });
    await resync(socketA, docA);
    await resync(socketB, docB);

    const textA = docA.getText("content").toString();
    const textB = docB.getText("content").toString();
    assert.match(textA, /alpha/);
    assert.match(textA, /beta/);
    assert.equal(textA, textB);
    socketA.disconnect();
    socketB.disconnect();
  });

  it("keeps an acknowledged update after a server restart", async () => {
    const issued = await identify(baseUrl, keys.secretKey, {
      user: { id: "persist", name: "Persist" },
      room: "doc:durable",
      permissions: expandRolePreset("editor"),
    });
    const socket = await connect(baseUrl, issued.json.token);
    await join(socket, "doc:durable");
    const doc = new Y.Doc();
    doc.getText("content").insert(0, "durable-word");
    const sync = await new Promise<{ generation: number }>((resolve, reject) => {
      socket.emit("yjs:sync", {}, (ack: { ok: boolean; generation?: number }) =>
        ack.ok ? resolve(ack as { generation: number }) : reject(),
      );
    });
    const saved = await new Promise<{ saved: boolean }>((resolve, reject) => {
      socket.emit(
        "yjs:update",
        { update: encode(Y.encodeStateAsUpdate(doc)), generation: sync.generation },
        (ack: { ok: boolean; saved?: boolean }) => (ack.ok ? resolve({ saved: Boolean(ack.saved) }) : reject()),
      );
    });
    assert.equal(saved.saved, true);
    socket.disconnect();
    await platform.close();

    platform = await createPlatform({ store, signingSeed: "milestone-b", revocationPollMs: 500 });
    baseUrl = `http://127.0.0.1:${await platform.listen(0)}`;
    const again = await identify(baseUrl, keys.secretKey, {
      user: { id: "persist", name: "Persist" },
      room: "doc:durable",
      permissions: expandRolePreset("editor"),
    });
    const socket2 = await connect(baseUrl, again.json.token);
    await join(socket2, "doc:durable");
    const recovered = new Y.Doc();
    await new Promise<void>((resolve, reject) => {
      socket2.emit("yjs:sync", {}, (ack: { ok: boolean; update?: string }) => {
        if (!ack.ok || !ack.update) return reject();
        Y.applyUpdate(recovered, decode(ack.update));
        resolve();
      });
    });
    assert.match(recovered.getText("content").toString(), /durable-word/);
    socket2.disconnect();
  });

  it("rejects viewer mutations, oversized updates, and duplicate request ids", async () => {
    const editor = await identify(baseUrl, keys.secretKey, {
      user: { id: "ed", name: "Ed" },
      room: "doc:acl",
      permissions: expandRolePreset("editor"),
    });
    const viewer = await identify(baseUrl, keys.secretKey, {
      user: { id: "view", name: "View" },
      room: "doc:acl",
      permissions: expandRolePreset("viewer"),
    });
    const editorSock = await connect(baseUrl, editor.json.token);
    const viewerSock = await connect(baseUrl, viewer.json.token);
    await join(editorSock, "doc:acl");
    await join(viewerSock, "doc:acl");

    const viewerDenied = await new Promise<{ ok: boolean; error?: { code: string } }>((resolve) => {
      const doc = new Y.Doc();
      doc.getText("content").insert(0, "nope");
      viewerSock.emit(
        "yjs:update",
        { update: encode(Y.encodeStateAsUpdate(doc)), generation: 1 },
        resolve,
      );
    });
    assert.equal(viewerDenied.ok, false);
    assert.equal(viewerDenied.error?.code, "FORBIDDEN");

    const huge = await new Promise<{ ok: boolean; error?: { code: string } }>((resolve) => {
      editorSock.emit(
        "yjs:update",
        { update: Buffer.alloc(300_000, 1).toString("base64"), generation: 1 },
        resolve,
      );
    });
    assert.equal(huge.ok, false);
    assert.equal(huge.error?.code, "PAYLOAD_TOO_LARGE");

    const doc = new Y.Doc();
    doc.getText("content").insert(0, "once");
    const payload = {
      update: encode(Y.encodeStateAsUpdate(doc)),
      generation: 1,
      requestId: "33333333-3333-4333-8333-333333333333",
    };
    const first = await new Promise<{ ok: boolean; duplicate?: boolean }>((resolve) => {
      editorSock.emit("yjs:update", payload, resolve);
    });
    const second = await new Promise<{ ok: boolean; duplicate?: boolean }>((resolve) => {
      editorSock.emit("yjs:update", payload, resolve);
    });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(second.duplicate, true);
    editorSock.disconnect();
    viewerSock.disconnect();
  });

  it("persists comments and restores a named version with a new generation", async () => {
    const issued = await identify(baseUrl, keys.secretKey, {
      user: { id: "hist", name: "Hist" },
      room: "doc:history",
      permissions: [...expandRolePreset("editor"), "history:restore"],
    });
    const socket = await connect(baseUrl, issued.json.token);
    await join(socket, "doc:history");
    const first = new Y.Doc();
    first.getText("content").insert(0, "version-one");
    await new Promise<void>((resolve, reject) => {
      socket.emit(
        "yjs:update",
        { update: encode(Y.encodeStateAsUpdate(first)), generation: 1 },
        (ack: { ok: boolean }) => (ack.ok ? resolve() : reject()),
      );
    });
    const created = await fetch(`${baseUrl}/v1/rooms/doc:history/versions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${issued.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "v1" }),
    });
    const versionBody = await created.json();
    assert.equal(created.status, 201);

    const second = new Y.Doc();
    second.getText("content").insert(0, "version-two");
    await new Promise<void>((resolve, reject) => {
      socket.emit(
        "yjs:update",
        { update: encode(Y.encodeStateAsUpdate(second)), generation: 1 },
        (ack: { ok: boolean }) => (ack.ok ? resolve() : reject()),
      );
    });

    const comment = await fetch(`${baseUrl}/v1/rooms/doc:history/comments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${issued.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ body: "check this", quote: "version-two" }),
    });
    assert.equal(comment.status, 201);
    const listed = await fetch(`${baseUrl}/v1/rooms/doc:history/comments`, {
      headers: { authorization: `Bearer ${issued.json.token}` },
    });
    const threads = await listed.json();
    assert.equal(threads.threads.length, 1);

    const restored = await fetch(
      `${baseUrl}/v1/rooms/doc:history/versions/${versionBody.version.id}/restore`,
      { method: "POST", headers: { authorization: `Bearer ${issued.json.token}` } },
    );
    assert.equal(restored.status, 200);
    const stale = await new Promise<{ ok: boolean; error?: { code: string } }>((resolve) => {
      socket.emit(
        "yjs:update",
        { update: encode(Y.encodeStateAsUpdate(second)), generation: 1 },
        resolve,
      );
    });
    assert.equal(stale.ok, false);
    assert.equal(stale.error?.code, "CONFLICT");
    socket.disconnect();
  });
});
