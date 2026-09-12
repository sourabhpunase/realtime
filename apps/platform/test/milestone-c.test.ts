import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { expandRolePreset } from "@realtime/protocol";
import { createPlatform } from "../src/createPlatform.js";
import { MemoryMediaAdapter, mediaIdentity, mediaRoomName } from "../src/media.js";
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

describe("Milestone C — media tokens", () => {
  const store = new MemoryStore();
  const media = new MemoryMediaAdapter();
  const tenant = store.createTenant("Voice");
  const application = store.createApplication(tenant.id, "Calls", "development");
  const keys = newKeyPair("development");
  store.addCredential(application.id, keys.publicKey, keys.secretKey);

  let platform: Awaited<ReturnType<typeof createPlatform>>;
  let baseUrl: string;

  before(async () => {
    platform = await createPlatform({
      store,
      media,
      signingSeed: "milestone-c",
    });
    baseUrl = `http://127.0.0.1:${await platform.listen(0)}`;
  });

  after(async () => {
    await platform.close();
  });

  it("rejects media tokens without media:join", async () => {
    const issued = await identify(baseUrl, keys.secretKey, {
      user: { id: "silent", name: "Silent" },
      room: "doc:voice",
      permissions: expandRolePreset("editor"),
    });
    const response = await fetch(`${baseUrl}/v1/rooms/doc:voice/media-token`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${issued.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ sources: ["microphone"] }),
    });
    assert.equal(response.status, 403);
  });

  it("issues a listen-only token when publish is not granted", async () => {
    const issued = await identify(baseUrl, keys.secretKey, {
      user: { id: "listener", name: "Listener" },
      room: "doc:voice",
      permissions: [...expandRolePreset("viewer"), "media:join"],
    });
    const response = await fetch(`${baseUrl}/v1/rooms/doc:voice/media-token`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${issued.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ sources: ["microphone"] }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.canPublish, false);
    assert.deepEqual(body.allowedSources, []);
    assert.equal(body.revocation.mechanism, "explicit-remove-participant");
  });

  it("restricts publishers to the microphone and removes them on revoke", async () => {
    const issued = await identify(baseUrl, keys.secretKey, {
      user: { id: "talker", name: "Talker" },
      room: "doc:voice",
      permissions: [...expandRolePreset("editor"), "media:join", "media:publish"],
    });
    const camera = await fetch(`${baseUrl}/v1/rooms/doc:voice/media-token`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${issued.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ sources: ["camera"] }),
    });
    assert.equal(camera.status, 403);

    const response = await fetch(`${baseUrl}/v1/rooms/doc:voice/media-token`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${issued.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ sources: ["microphone"] }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.canPublish, true);
    assert.deepEqual(body.allowedSources, ["microphone"]);
    assert.equal(body.identity, mediaIdentity(application.id, "talker"));
    assert.equal(body.roomName, mediaRoomName(application.id, "doc:voice"));

    await fetch(`${baseUrl}/v1/rooms/doc:voice/revoke`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${keys.secretKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ userId: "talker" }),
    });
    assert.ok(
      media.removed.includes(`${mediaRoomName(application.id, "doc:voice")}:${mediaIdentity(application.id, "talker")}`),
    );
  });

  it("issues camera and screen only when those grants are present", async () => {
    const issued = await identify(baseUrl, keys.secretKey, {
      user: { id: "host", name: "Host" },
      room: "doc:voice",
      permissions: [
        ...expandRolePreset("editor"),
        "media:join",
        "media:publish",
        "media:video",
        "media:screen",
      ],
    });
    const response = await fetch(`${baseUrl}/v1/rooms/doc:voice/media-token`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${issued.json.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ sources: ["microphone", "camera", "screen"] }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.allowedSources, ["microphone", "camera", "screen"]);
  });

  it("reports a single-instance ready payload without Redis", async () => {
    const response = await fetch(`${baseUrl}/ready`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.instance, "single");
  });
});
