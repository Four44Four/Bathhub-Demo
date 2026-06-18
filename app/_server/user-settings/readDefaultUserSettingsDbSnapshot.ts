import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_USER_SETTINGS_DB_SNAPSHOT_RELATIVE_PATH } from "@/app/_shared/user-settings/DefaultUserSettingsDbPaths";

export function resolveDefaultUserSettingsDbSnapshotPath(
  workspaceRoot: string = process.cwd(),
): string {
  return path.join(workspaceRoot, DEFAULT_USER_SETTINGS_DB_SNAPSHOT_RELATIVE_PATH);
}

export async function readDefaultUserSettingsDbSnapshotBytes(
  workspaceRoot: string = process.cwd(),
): Promise<Uint8Array> {
  const snapshotPath = resolveDefaultUserSettingsDbSnapshotPath(workspaceRoot);
  const buffer = await readFile(snapshotPath);
  return new Uint8Array(buffer);
}
