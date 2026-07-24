import { execUserSettingsMigrationScripts } from "@/app/_shared/user-settings/execUserSettingsMigrationScripts";
import {
  USER_SETTINGS_META_TABLE_NAME,
  USER_SETTINGS_SCHEMA_VERSION_META_KEY,
  USER_SETTINGS_TABLE_NAME,
  type UserSettingsRow,
} from "@/app/_shared/user-settings/UserSettingsSchema";
import { isSqliteDatabaseBytes } from "../pure/bathroom/SqliteDatabaseBytes";
import type { SqliteDb, SqliteWasm } from "../local-db/web/LocalDbSqlite";

export type UserSettingsDbPort = {
  init(): Promise<void>;
  getPersistentSchemaVersion(): Promise<number | null>;
  readSettingsFromDb(): Promise<UserSettingsRow>;
  saveSettingsToDb(settings: UserSettingsRow): Promise<void>;
  runForwardMigration(forwardSql: readonly string[]): Promise<void>;
  persistToDisk(): Promise<void>;
  hadLocalPersistentDbAtStartup(): Promise<boolean>;
  replaceDbFromBytes(bytes: Uint8Array): Promise<void>;
};

export type UserSettingsDbSqliteOptions = {
  hydrateFromBytes?: () => Promise<Uint8Array | null>;
  onInvalidHydrateBytes?: () => void | Promise<void>;
  onAfterPersist?: (
    db: SqliteDb,
    sqlite3: SqliteWasm,
  ) => void | Promise<void>;
  initSqliteWasm?: () => Promise<SqliteWasm>;
};

function listTableNames(db: SqliteDb): string[] {
  const rows = db.selectObjects(
    `SELECT name FROM sqlite_master WHERE type IN ('table', 'view')`,
  );
  return rows
    .map((row) => row.name)
    .filter((name): name is string => typeof name === "string");
}

export function isUserSettingsSchemaReady(tableNames: string[]): boolean {
  return (
    tableNames.includes(USER_SETTINGS_META_TABLE_NAME) &&
    tableNames.includes(USER_SETTINGS_TABLE_NAME)
  );
}

function execMigrationScripts(db: SqliteDb, scripts: readonly string[]): void {
  execUserSettingsMigrationScripts((sql) => {
    db.exec(sql);
  }, scripts);
}

function readMetaValue(db: SqliteDb, key: string): string | null {
  const rows = db.selectObjects(
    `SELECT value FROM ${USER_SETTINGS_META_TABLE_NAME} WHERE key = ?`,
    [key],
  );
  const value = rows[0]?.value;
  return typeof value === "string" ? value : null;
}

function parseSchemaVersion(raw: string | null): number | null {
  if (raw == null) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function rowToUserSettings(row: Record<string, unknown>): UserSettingsRow {
  return {
    globe_movement_smooth: row.globe_movement_smooth === 1,
    camera_init_surface_offset_m: Number(row.camera_init_surface_offset_m),
    find_nearest_bathroom_max_dist_m: Number(row.find_nearest_bathroom_max_dist_m),
    find_nearest_bathroom_min_rating: Number(row.find_nearest_bathroom_min_rating),
  };
}

function readSettingsRow(db: SqliteDb): UserSettingsRow {
  const rows = db.selectObjects(
    `SELECT
      globe_movement_smooth,
      camera_init_surface_offset_m,
      find_nearest_bathroom_max_dist_m,
      find_nearest_bathroom_min_rating
    FROM ${USER_SETTINGS_TABLE_NAME}
    WHERE id = 1`,
  );
  if (rows.length === 0) {
    throw new Error("User settings row is missing from persistent SQLite.");
  }
  return rowToUserSettings(rows[0]!);
}

export function loadUserSettingsBytesIntoMemoryDb(
  sqlite3: SqliteWasm,
  db: SqliteDb,
  bytes: Uint8Array,
): void {
  if (!db.pointer) {
    throw new Error("User settings database pointer is unavailable.");
  }
  if (!isSqliteDatabaseBytes(bytes)) {
    throw new Error("User settings hydrate bytes are not a SQLite database.");
  }

  const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
  const resizeableFlag = sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE ?? 2;
  const rc = sqlite3.capi.sqlite3_deserialize(
    db.pointer,
    "main",
    pointer,
    bytes.byteLength,
    bytes.byteLength,
    resizeableFlag,
  );
  if (rc !== 0) {
    sqlite3.wasm.dealloc(pointer);
    throw new Error(`sqlite3_deserialize failed with code ${rc}`);
  }
  // sqlite-wasm keeps referencing this allocation for the DB lifetime; do not dealloc.
}

export function createUserSettingsDbSqlite(
  options: UserSettingsDbSqliteOptions,
): UserSettingsDbPort & {
  getSqliteDbForTests: () => Promise<SqliteDb>;
} {
  let db: SqliteDb | null = null;
  let sqlite3Module: SqliteWasm | null = null;
  let initPromise: Promise<void> | null = null;
  let localPersistentDbPresentAtStartup = false;

  const ensureDb = async (): Promise<{ db: SqliteDb; sqlite3: SqliteWasm }> => {
    if (initPromise) {
      await initPromise;
    }
    if (!db || !sqlite3Module) {
      throw new Error("User settings database is not initialized.");
    }
    return { db, sqlite3: sqlite3Module };
  };

  const afterPersist = async (
    activeDb: SqliteDb,
    sqlite3: SqliteWasm,
  ): Promise<void> => {
    await options.onAfterPersist?.(activeDb, sqlite3);
  };

  return {
    init(): Promise<void> {
      if (initPromise) return initPromise;

      initPromise = (async () => {
        try {
          const sqlite3 = options.initSqliteWasm
            ? await options.initSqliteWasm()
            : await (
                (await import("@sqlite.org/sqlite-wasm")).default as unknown as () => Promise<SqliteWasm>
              )();
          sqlite3Module = sqlite3;

          let memoryDb = new sqlite3.oo1.DB(":memory:");
          let hydratedFromDisk = false;

          const onDiskBytes = options.hydrateFromBytes
            ? await options.hydrateFromBytes()
            : null;
          if (onDiskBytes && isSqliteDatabaseBytes(onDiskBytes)) {
            try {
              loadUserSettingsBytesIntoMemoryDb(sqlite3, memoryDb, onDiskBytes);
              if (!isUserSettingsSchemaReady(listTableNames(memoryDb))) {
                throw new Error("User settings on-disk schema is incomplete.");
              }
              hydratedFromDisk = true;
              localPersistentDbPresentAtStartup = true;
            } catch {
              memoryDb = new sqlite3.oo1.DB(":memory:");
              await options.onInvalidHydrateBytes?.();
            }
          } else if (onDiskBytes) {
            await options.onInvalidHydrateBytes?.();
          }

          db = memoryDb;

          if (!hydratedFromDisk) {
            memoryDb.exec("PRAGMA journal_mode=WAL");
          }
        } catch (error) {
          initPromise = null;
          db = null;
          sqlite3Module = null;
          throw error;
        }
      })();

      return initPromise;
    },

    async getPersistentSchemaVersion(): Promise<number | null> {
      const { db: activeDb } = await ensureDb();
      if (!isUserSettingsSchemaReady(listTableNames(activeDb))) {
        return null;
      }
      return parseSchemaVersion(
        readMetaValue(activeDb, USER_SETTINGS_SCHEMA_VERSION_META_KEY),
      );
    },

    async readSettingsFromDb(): Promise<UserSettingsRow> {
      const { db: activeDb } = await ensureDb();
      return readSettingsRow(activeDb);
    },

    async saveSettingsToDb(settings): Promise<void> {
      const { db: activeDb, sqlite3 } = await ensureDb();
      activeDb.exec(
        `UPDATE ${USER_SETTINGS_TABLE_NAME}
         SET globe_movement_smooth = ?,
             camera_init_surface_offset_m = ?,
             find_nearest_bathroom_max_dist_m = ?,
             find_nearest_bathroom_min_rating = ?
         WHERE id = 1`,
        {
          bind: [
            settings.globe_movement_smooth ? 1 : 0,
            settings.camera_init_surface_offset_m,
            settings.find_nearest_bathroom_max_dist_m,
            settings.find_nearest_bathroom_min_rating,
          ],
        },
      );
      await afterPersist(activeDb, sqlite3);
    },

    async runForwardMigration(forwardSql): Promise<void> {
      const { db: activeDb, sqlite3 } = await ensureDb();
      execMigrationScripts(activeDb, forwardSql);
      await afterPersist(activeDb, sqlite3);
    },

    async persistToDisk(): Promise<void> {
      const { db: activeDb, sqlite3 } = await ensureDb();
      await afterPersist(activeDb, sqlite3);
    },

    async hadLocalPersistentDbAtStartup(): Promise<boolean> {
      await ensureDb();
      return localPersistentDbPresentAtStartup;
    },

    async replaceDbFromBytes(bytes): Promise<void> {
      const { sqlite3 } = await ensureDb();
      const replacementDb = new sqlite3.oo1.DB(":memory:");
      loadUserSettingsBytesIntoMemoryDb(sqlite3, replacementDb, bytes);
      if (!isUserSettingsSchemaReady(listTableNames(replacementDb))) {
        throw new Error("Replacement user settings database schema is incomplete.");
      }
      db = replacementDb;
      await afterPersist(replacementDb, sqlite3);
    },

    async getSqliteDbForTests(): Promise<SqliteDb> {
      const { db: activeDb } = await ensureDb();
      return activeDb;
    },
  };
}
