import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  USERS,
  canAccessDocument,
  permissionsFor,
  verifyUser,
} from "../src/users.js";

describe("sample integrator authorization", () => {
  it("authenticates only known users", () => {
    assert.ok(verifyUser("alice@example.com", "alice-pass-1"));
    assert.equal(verifyUser("alice@example.com", "wrong"), null);
    assert.equal(verifyUser("platform-admin@example.com", "alice-pass-1"), null);
  });

  it("does not let Bob read Alice's private document", () => {
    const alice = USERS[0];
    const bob = USERS[1];
    assert.equal(canAccessDocument(alice.id, "doc:alice"), true);
    assert.equal(canAccessDocument(bob.id, "doc:alice"), false);
    assert.equal(permissionsFor(bob.id, "doc:alice").length, 0);
    assert.ok(permissionsFor(alice.id, "doc:welcome").includes("room:write"));
    assert.ok(permissionsFor(alice.id, "doc:welcome").includes("media:publish"));
    assert.equal(canAccessDocument(bob.id, "doc:review"), true);
    assert.ok(permissionsFor(bob.id, "doc:review").includes("suggestions:write"));
    assert.ok(!permissionsFor(bob.id, "doc:review").includes("room:write"));
  });
});
