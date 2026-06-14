"use client";

import { createUserSettingsDbSqlite } from "../UserSettingsDbSqlite";
import type { UserSettingsDbPort } from "../UserSettingsDbSqlite";
import type { SqliteDb, SqliteWasm } from "../../local-db/web/LocalDbSqlite";
import {
  deleteUserSettingsDbFromOpfs,
  readUserSettingsDbBytesFromOpfs,
  writeUserSettingsDbBytesToOpfs,
} from "./UserSettingsDiskStorage";
import { isSqliteDatabaseBytes } from "../../pure/bathroom/SqliteDatabaseBytes";

let backupTimer: ReturnType<typeof setTimeout> | null = null;

async function readOnDiskUserSettingsBytes(): Promise<Uint8Array | null> {
  const fromOpfs = await readUserSettingsDbBytesFromOpfs();
  if (fromOpfs) {
    if (isSqliteDatabaseBytes(fromOpfs)) return fromOpfs;
    await deleteUserSettingsDbFromOpfs();
  }
  return null;
}

function scheduleDiskBackup(db: SqliteDb, sqlite3: SqliteWasm): void {
  if (backupTimer !== null) {
    clearTimeout(backupTimer);
  }
  backupTimer = setTimeout(() => {
    backupTimer = null;
    void flushDiskBackup(db, sqlite3);
  }, 250);
}

async function flushDiskBackup(db: SqliteDb, sqlite3: SqliteWasm): Promise<void> {
  try {
    const bytes = sqlite3.capi.sqlite3_js_db_export(db);
    if (!bytes || bytes.byteLength === 0) return;
    await writeUserSettingsDbBytesToOpfs(bytes);
  } catch {
    // Disk backup is best-effort for the web demo.
  }
}

export function createUserSettingsDbWeb(): UserSettingsDbPort {
  return createUserSettingsDbSqlite({
    hydrateFromBytes: readOnDiskUserSettingsBytes,
    onInvalidHydrateBytes: () => deleteUserSettingsDbFromOpfs(),
    onAfterMutate: scheduleDiskBackup,
  });
}

let defaultUserSettingsDb: UserSettingsDbPort | null = null;

export function getUserSettingsDb(): UserSettingsDbPort {
  if (!defaultUserSettingsDb) {
    defaultUserSettingsDb = createUserSettingsDbWeb();
  }
  return defaultUserSettingsDb;
}
