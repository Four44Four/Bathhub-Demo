import nextEnv from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertServerEnvValid } from "../app/_server/bootstrap/validateServerEnv.ts";

const { loadEnvConfig } = nextEnv;

const projectDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const dev = process.argv.includes("--dev");

loadEnvConfig(projectDir, dev);

try {
  await assertServerEnvValid();
} catch {
  process.exitCode = 1;
}
