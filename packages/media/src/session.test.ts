import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RoomAudioSession } from "./session.js";

function fakeRoom() {
  const handlers = new Map<string, Function[]>();
  const room = {
    disconnected: false,
    connectArgs: [] as string[],
    micEnabled: false,
    cameraEnabled: false,
    screenEnabled: false,
    localParticipant: {
      audioTrackPublications: new Map(),
      videoTrackPublications: new Map(),
      async setMicrophoneEnabled(enabled: boolean) {
        room.micEnabled = enabled;
      },
      async setCameraEnabled(enabled: boolean) {
        room.cameraEnabled = enabled;
        return undefined;
      },
      async setScreenShareEnabled(enabled: boolean) {
        room.screenEnabled = enabled;
        return undefined;
      },
    },
    on(event: string, handler: Function) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      return room;
    },
    removeAllListeners() {
      handlers.clear();
    },
    async connect(url: string, token: string) {
      room.connectArgs = [url, token];
    },
    disconnect() {
      room.disconnected = true;
    },
  };
  return room;
}

const credentials = {
  token: "lk",
  url: "ws://localhost:7880",
  roomName: "rt_test",
  identity: "app:user",
  expiresAt: new Date().toISOString(),
  expiresIn: 900,
  revocation: { mechanism: "explicit-remove-participant" as const, note: "" },
};

describe("RoomAudioSession", () => {
  it("connects with issued media credentials and releases on leave", async () => {
    const room = fakeRoom();
    const session = new RoomAudioSession(() => room as never);
    await session.join({
      ...credentials,
      canPublish: true,
      allowedSources: ["microphone"],
    });
    assert.deepEqual(room.connectArgs, ["ws://localhost:7880", "lk"]);
    assert.equal(room.micEnabled, true);
    assert.equal(session.getSnapshot().status, "connected");
    await session.leave();
    assert.equal(room.disconnected, true);
    assert.equal(session.getSnapshot().status, "idle");
  });

  it("does not enable the microphone for listen-only grants", async () => {
    const room = fakeRoom();
    const session = new RoomAudioSession(() => room as never);
    await session.join({
      ...credentials,
      canPublish: false,
      allowedSources: [],
    });
    assert.equal(room.micEnabled, false);
    await session.leave();
  });

  it("does not start camera or screen until those controls are used", async () => {
    const room = fakeRoom();
    const session = new RoomAudioSession(() => room as never);
    await session.join({
      ...credentials,
      canPublish: true,
      allowedSources: ["microphone", "camera", "screen"],
    });
    assert.equal(room.micEnabled, true);
    assert.equal(room.cameraEnabled, false);
    assert.equal(room.screenEnabled, false);
    await session.setCameraEnabled(true);
    await session.setScreenShareEnabled(true);
    assert.equal(room.cameraEnabled, true);
    assert.equal(room.screenEnabled, true);
    await session.leave();
  });

  it("ignores camera and screen when those sources were not granted", async () => {
    const room = fakeRoom();
    const session = new RoomAudioSession(() => room as never);
    await session.join({
      ...credentials,
      canPublish: true,
      allowedSources: ["microphone"],
    });
    await session.setCameraEnabled(true);
    await session.setScreenShareEnabled(true);
    assert.equal(room.cameraEnabled, false);
    assert.equal(room.screenEnabled, false);
    await session.leave();
  });
});
