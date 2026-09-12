import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { io as ioc, type Socket } from "socket.io-client";
import * as Y from "yjs";
import { expandRolePreset } from "@realtime/protocol";
import { createPlatform } from "../src/createPlatform.js";
import { yXmlPlainText } from "../src/plaintext.js";
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

describe("Milestone D — suggestions, chat, grants", () => {
  const store = new MemoryStore();
  const tenant = store.createTenant("Product");
  const application = store.createApplication(tenant.id, "Docs", "development");
  const keys = newKeyPair("development");
  store.addCredential(application.id, keys.publicKey, keys.secretKey);

  let platform: Awaited<ReturnType<typeof createPlatform>>;
  let baseUrl: string;

  before(async () => {
    platform = await createPlatform({ store, signingSeed: "milestone-d" });
    baseUrl = `http://127.0.0.1:${await platform.listen(0)}`;
  });

  after(async () => {
    await platform.close();
  });

  it("lets a suggester propose but not write or accept, and applies accepted text on the server", async () => {
    const suggester = await identify(baseUrl, keys.secretKey, {
      user: { id: "pat", name: "Pat" },
      room: "doc:review",
      permissions: expandRolePreset("suggester"),
    });
    const editor = await identify(baseUrl, keys.secretKey, {
      user: { id: "ada", name: "Ada" },
      room: "doc:review",
      permissions: expandRolePreset("editor"),
    });

    const write = await new Promise<{ ok: boolean; error?: { message: string } }>((resolve) => {
      void connect(baseUrl, suggester.json.token).then(async (socket) => {
        await join(socket, "doc:review");
        socket.emit(
          "yjs:update",
          { update: Buffer.from([0, 0]).toString("base64"), generation: 1 },
          resolve,
        );
      });
    });
    assert.equal(write.ok, false);

    const created = await fetch(`${baseUrl}/v1/rooms/doc:review/suggestions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${suggester.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ kind: "insert", insertText: "accepted-by-server", offset: 0 }),
    });
    const createdBody = await created.json();
    assert.equal(created.status, 201);
    const suggestionId = createdBody.suggestion.id as string;

    const stolen = await fetch(`${baseUrl}/v1/rooms/doc:review/suggestions/${suggestionId}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${suggester.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "accept" }),
    });
    assert.equal(stolen.status, 403);

    const accepted = await fetch(`${baseUrl}/v1/rooms/doc:review/suggestions/${suggestionId}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${editor.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "accept" }),
    });
    const acceptedBody = await accepted.json();
    assert.equal(accepted.status, 200);
    assert.equal(acceptedBody.suggestion.status, "accepted");
    assert.match(acceptedBody.applied.text, /accepted-by-server/);

    const socket = await connect(baseUrl, editor.json.token);
    await join(socket, "doc:review");
    const sync = await new Promise<{ ok: boolean; update: string }>((resolve, reject) => {
      socket.emit("yjs:sync", {}, (ack: { ok: boolean; update?: string }) =>
        ack.ok && ack.update ? resolve({ ok: true, update: ack.update }) : reject(new Error("sync")),
      );
    });
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Uint8Array.from(Buffer.from(sync.update, "base64")));
    assert.match(yXmlPlainText(doc), /accepted-by-server/);
    socket.close();
  });

  it("rejects a viewer chat post and stores an editor message once", async () => {
    const viewer = await identify(baseUrl, keys.secretKey, {
      user: { id: "vie", name: "Vie" },
      room: "doc:chat",
      permissions: expandRolePreset("viewer"),
    });
    const editor = await identify(baseUrl, keys.secretKey, {
      user: { id: "ed", name: "Ed" },
      room: "doc:chat",
      permissions: expandRolePreset("editor"),
    });
    const denied = await fetch(`${baseUrl}/v1/rooms/doc:chat/chat`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${viewer.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ body: "nope" }),
    });
    assert.equal(denied.status, 403);

    const first = await fetch(`${baseUrl}/v1/rooms/doc:chat/chat`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${editor.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ body: "hello room", clientId: "chat-1" }),
    });
    const second = await fetch(`${baseUrl}/v1/rooms/doc:chat/chat`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${editor.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ body: "hello room", clientId: "chat-1" }),
    });
    assert.equal(first.status, 201);
    assert.equal((await second.json()).duplicate, true);
    const listed = await fetch(`${baseUrl}/v1/rooms/doc:chat/chat`, {
      headers: { authorization: `Bearer ${editor.json.token}` },
    });
    const body = await listed.json();
    assert.equal(body.messages.length, 1);
  });

  it("stores optional platform grants without changing token minting", async () => {
    const granted = await fetch(`${baseUrl}/v1/rooms/doc:review/grants`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${keys.secretKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        userId: "pat",
        permissions: expandRolePreset("suggester"),
      }),
    });
    assert.equal(granted.status, 201);
    const listed = await fetch(`${baseUrl}/v1/rooms/doc:review/grants`, {
      headers: { authorization: `Bearer ${keys.secretKey}` },
    });
    const body = await listed.json();
    assert.equal(body.grants[0].userId, "pat");
    assert.match(body.precedence, /Delegated/);
  });
});
