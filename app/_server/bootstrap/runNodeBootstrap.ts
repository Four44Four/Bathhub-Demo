import { assertServerEnvValid } from "./validateServerEnv.ts";

export async function runNodeBootstrap(): Promise<void> {
  await assertServerEnvValid();
}
