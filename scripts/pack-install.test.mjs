import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

describe("Milestone E — packed SDK tarballs", () => {
  it("installs protocol/core/node tarballs without workspace aliases", () => {
    const packDir = mkdtempSync(join(tmpdir(), "rt-pack-"));
    for (const workspace of ["@realtime/protocol", "@realtime/core", "@realtime/node"]) {
      run("npm", ["pack", "-w", workspace, "--pack-destination", packDir], root);
    }
    const tarballs = readdirSync(packDir).filter((name) => name.endsWith(".tgz")).sort();
    assert.equal(tarballs.length, 3);

    const appDir = mkdtempSync(join(tmpdir(), "rt-app-"));
    writeFileSync(
      join(appDir, "package.json"),
      JSON.stringify({ name: "fresh-integrator", type: "module", private: true }, null, 2),
    );
    run(
      "npm",
      ["install", ...tarballs.map((name) => join(packDir, name))],
      appDir,
    );

    const probe = writeFileSync(
      join(appDir, "probe.mjs"),
      `
      import { PROTOCOL_VERSION, expandRolePreset } from "@realtime/protocol";
      import { RealtimeClient } from "@realtime/core";
      import { Realtime } from "@realtime/node";
      if (PROTOCOL_VERSION !== 1) throw new Error("protocol");
      if (!expandRolePreset("suggester").includes("suggestions:write")) throw new Error("role");
      const client = new RealtimeClient({ publicKey: "pk_test_pack", endpoint: "http://127.0.0.1:9" });
      if (!client.enterRoom) throw new Error("core");
      const node = new Realtime({ secretKey: "sk_test_pack", endpoint: "http://127.0.0.1:9" });
      if (!node.identify || !node.rooms.grant) throw new Error("node");
      console.log("ok");
      `,
    );
    void probe;
    const output = run("node", ["probe.mjs"], appDir);
    assert.match(output, /ok/);
  });
});
