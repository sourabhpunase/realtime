import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "dist-packages");
mkdirSync(out, { recursive: true });

const workspaces = [
  "@realtime/protocol",
  "@realtime/core",
  "@realtime/node",
  "@realtime/react",
  "@realtime/editor",
  "@realtime/media",
];

for (const workspace of workspaces) {
  const result = spawnSync("npm", ["pack", "-w", workspace, "--pack-destination", out], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }
  console.log(result.stdout.trim());
}
