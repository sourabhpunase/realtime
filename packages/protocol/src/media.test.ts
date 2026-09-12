import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expandRolePreset } from "./permissions.js";
import { authorizeMediaSources, publishableMediaSources } from "./media.js";

describe("media sources", () => {
  it("lets listen-only clients request microphone without publishing", () => {
    assert.deepEqual(authorizeMediaSources(["media:join"], ["microphone"]), []);
  });

  it("does not let an audio-only grant enable camera or screen", () => {
    const perms = [...expandRolePreset("editor"), "media:join", "media:publish"];
    assert.deepEqual(publishableMediaSources(perms), ["microphone"]);
    assert.throws(() => authorizeMediaSources(perms, ["camera"]), /camera/);
    assert.throws(() => authorizeMediaSources(perms, ["screen"]), /screen/);
    assert.deepEqual(authorizeMediaSources(perms, ["microphone"]), ["microphone"]);
  });

  it("requires explicit video and screen grants", () => {
    const perms = ["media:join", "media:publish", "media:video", "media:screen"];
    assert.deepEqual(authorizeMediaSources(perms, ["microphone", "camera", "screen"]), [
      "microphone",
      "camera",
      "screen",
    ]);
  });
});
