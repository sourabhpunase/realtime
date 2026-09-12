import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expandRolePreset,
  hasPermission,
  normalizePermissions,
} from "./permissions.js";

describe("permissions", () => {
  it("expands editor without media publish", () => {
    const perms = expandRolePreset("editor");
    assert.ok(perms.includes("room:write"));
    assert.ok(perms.includes("suggestions:accept"));
    assert.ok(!perms.includes("media:publish"));
    assert.ok(!perms.includes("media:video"));
    assert.ok(!perms.includes("media:screen"));
  });

  it("keeps suggesters off unrestricted document writes", () => {
    const perms = expandRolePreset("suggester");
    assert.ok(perms.includes("suggestions:write"));
    assert.ok(!perms.includes("room:write"));
    assert.ok(!perms.includes("suggestions:accept"));
  });

  it("treats room:admin as a super-grant", () => {
    assert.equal(hasPermission(["room:admin"], "comments:write"), true);
  });

  it("rejects unknown permissions", () => {
    assert.throws(() => normalizePermissions(["room:join", "laser:write"]));
  });
});
