import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createPlatform } from "../src/createPlatform.js";
import { MemoryStore } from "../src/store.js";

describe("Milestone E — distribution surface", () => {
  const store = new MemoryStore();
  let platform: Awaited<ReturnType<typeof createPlatform>>;
  let baseUrl: string;

  before(async () => {
    platform = await createPlatform({ store, signingSeed: "milestone-e" });
    baseUrl = `http://127.0.0.1:${await platform.listen(0)}`;
  });

  after(async () => {
    await platform.close();
  });

  it("reports the store driver and single-instance topology on /ready", async () => {
    const response = await fetch(`${baseUrl}/ready`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.store, "memory");
    assert.equal(body.instance, "single");
  });
});
