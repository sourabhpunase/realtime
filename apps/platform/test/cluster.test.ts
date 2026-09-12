import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoryCluster } from "../src/cluster.js";

describe("memory cluster", () => {
  it("tracks presence per channel", async () => {
    const cluster = memoryCluster();
    assert.equal(cluster.mode, "single");
    await cluster.presenceAdd("room-a", "s1", {
      id: "u1",
      name: "Ada",
      sessionId: "jti-1",
      permissions: ["room:join"],
      status: "active",
    });
    const listed = await cluster.presenceList("room-a");
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.name, "Ada");
    const removed = await cluster.presenceRemove("room-a", "s1");
    assert.equal(removed?.id, "u1");
    assert.deepEqual(await cluster.presenceList("room-a"), []);
    await cluster.close();
  });
});
