import {
  shouldInstallInitialUserSettingsDbFromServer,
  type InitialUserSettingsDbInstallResult,
} from "@/app/_shared/user-settings/installInitialUserSettingsDb";
import type { UserSettingsDbPort } from "./UserSettingsDbSqlite";
import { fetchDefaultUserSettingsDbBytes } from "./web/fetchDefaultUserSettingsDbBytes";
import { isSqliteDatabaseBytes } from "../pure/bathroom/SqliteDatabaseBytes";

export type InstallInitialUserSettingsDbDeps = {
  fetchDefaultDbBytes: () => Promise<Uint8Array | null>;
  isValidSqliteBytes: (bytes: Uint8Array) => boolean;
};

export const defaultInstallInitialUserSettingsDbDeps: InstallInitialUserSettingsDbDeps =
  {
    fetchDefaultDbBytes: fetchDefaultUserSettingsDbBytes,
    isValidSqliteBytes: isSqliteDatabaseBytes,
  };

export async function installInitialUserSettingsDbFromServer(
  db: UserSettingsDbPort,
  deps: InstallInitialUserSettingsDbDeps = defaultInstallInitialUserSettingsDbDeps,
): Promise<InitialUserSettingsDbInstallResult> {
  const hadLocalPersistentDb = await db.hadLocalPersistentDbAtStartup();
  const persistentVersion = await db.getPersistentSchemaVersion();
  if (
    !shouldInstallInitialUserSettingsDbFromServer(
      persistentVersion,
      hadLocalPersistentDb,
    )
  ) {
    return { ok: false, reason: "not_applicable" };
  }

  const bytes = await deps.fetchDefaultDbBytes();
  if (bytes == null || !deps.isValidSqliteBytes(bytes)) {
    return { ok: false, reason: "fetch_failed" };
  }

  await db.replaceDbFromBytes(bytes);
  await db.persistToDisk();
  return { ok: true };
}
