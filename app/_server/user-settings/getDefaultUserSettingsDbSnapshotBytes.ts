import { readDefaultUserSettingsDbSnapshotBytes } from "./readDefaultUserSettingsDbSnapshot";

export async function getDefaultUserSettingsDbSnapshotBytes(): Promise<Uint8Array> {
  return readDefaultUserSettingsDbSnapshotBytes();
}
