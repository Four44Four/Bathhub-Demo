import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const image = "bathhub-supabase-test";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("supabase-test: building Docker image...");
run("docker", [
  "build",
  "-f",
  "supabase-test/Dockerfile",
  "-t",
  image,
  ".",
]);

console.log("supabase-test: running containerized tests...");
const testRun = spawnSync(
  "docker",
  ["run", "--rm", "--privileged", image],
  {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (testRun.status === 0) {
  console.log("supabase-test: PASSED");
  process.exit(0);
}

console.log("supabase-test: FAILED");
process.exit(testRun.status ?? 1);
