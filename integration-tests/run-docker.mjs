import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const image = "bathhub-integration-tests";

const ANSI = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
};

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

console.log("integration-tests: building Docker image...");
run("docker", [
  "build",
  "-f",
  "integration-tests/Dockerfile",
  "-t",
  image,
  ".",
]);

console.log("integration-tests: running containerized tests...");
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
  console.log(`${ANSI.green}integration-tests: PASSED${ANSI.reset}`);
  process.exit(0);
}

console.log(`${ANSI.red}integration-tests: FAILED${ANSI.reset}`);
process.exit(testRun.status ?? 1);
