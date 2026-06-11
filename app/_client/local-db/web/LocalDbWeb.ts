"use client";

import { BathroomLocalDB } from "../../ComponentConstants";
import { type BathroomLocalDbPort } from "../LocalDbPort";
import {
  readGpkgBytesFromFileHandle,
  writeGpkgBytesToDiskBackup,
} from "./GpkgFileBackup";
import { isSqliteDatabaseBytes } from "../../pure/bathroom/SqliteDatabaseBytes";
import {
  deleteGpkgFromOpfs,
  readGpkgBytesFromOpfs,
  writeGpkgBytesToOpfs,
} from "./GpkgDiskStorage";
import { BATHROOM_GPKG_FILENAME } from "./LocalDbSchema";
import {
  createBathroomLocalDbSqlite,
  type SqliteDb,
  type SqliteWasm,
} from "./LocalDbSqlite";

let backupTimer: ReturnType<typeof setTimeout> | null = null;

async function readOnDiskGpkgBytes(): Promise<Uint8Array | null> {
  const fromOpfs = await readGpkgBytesFromOpfs(BATHROOM_GPKG_FILENAME);
  if (fromOpfs) {
    if (isSqliteDatabaseBytes(fromOpfs)) return fromOpfs;
    await deleteGpkgFromOpfs(BATHROOM_GPKG_FILENAME);
  }

  const fromHandle = await readGpkgBytesFromFileHandle();
  if (fromHandle && isSqliteDatabaseBytes(fromHandle)) return fromHandle;
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
    await writeGpkgBytesToOpfs(bytes, BATHROOM_GPKG_FILENAME);
    await writeGpkgBytesToDiskBackup(bytes);
  } catch {
    // Disk backup is best-effort for the web demo.
  }
}

export function createBathroomLocalDbWeb(): BathroomLocalDbPort {
  return createBathroomLocalDbSqlite({
    cacheExpirationSecs: BathroomLocalDB.CACHE_EXPIRATION_SECS,
    hydrateFromBytes: readOnDiskGpkgBytes,
    onInvalidHydrateBytes: () => deleteGpkgFromOpfs(BATHROOM_GPKG_FILENAME),
    onAfterMutate: scheduleDiskBackup,
  });
}

let defaultLocalDb: BathroomLocalDbPort | null = null;

export function getBathroomLocalDb(): BathroomLocalDbPort {
  if (!defaultLocalDb) {
    defaultLocalDb = createBathroomLocalDbWeb();
  }
  return defaultLocalDb;
}
