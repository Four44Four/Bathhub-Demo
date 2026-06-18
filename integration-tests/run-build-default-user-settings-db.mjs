import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");

const result = spawnSync(
  "npx",
  [
    "jest",
    "--runInBand",
    "--verbose",
    "integration-tests/buildDefaultUserSettingsDbSnapshot.test.ts",
  ],
  {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : ""}--experimental-vm-modules`,
    },
    stdio: "inherit",
    shell: true,
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
