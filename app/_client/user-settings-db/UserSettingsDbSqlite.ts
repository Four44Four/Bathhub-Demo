import {
  USER_SETTINGS_DEFAULTS,
  USER_SETTINGS_META_TABLE_NAME,
  USER_SETTINGS_SCHEMA_VERSION_META_KEY,
  USER_SETTINGS_TABLE_NAME,
  type UserSettingsColumnName,
  type UserSettingsRow,
} from "@/app/_shared/user-settings/UserSettingsSchema";
import { USER_SETTINGS_MIGRATION_V0_TO_V1 } from "@/app/_shared/user-settings/migrations/v0-to-v1";
import { isSqliteDatabaseBytes } from "../pure/bathroom/SqliteDatabaseBytes";
import type { SqliteDb, SqliteWasm } from "../local-db/web/LocalDbSqlite";

export type UserSettingsDbPort = {
  init(): Promise<void>;
  getPersistentSchemaVersion(): Promise<number | null>;
  getSettings(): Promise<UserSettingsRow>;
  updateBooleanSetting(
    column: Extract<UserSettingsColumnName, "globe_movement_smooth">,
    value: boolean,
  ): Promise<void>;
  updateIntSetting(
    column: Exclude<UserSettingsColumnName, "globe_movement_smooth">,
    value: number,
  ): Promise<void>;
};

export type UserSettingsDbSqliteOptions = {
  hydrateFromBytes?: () => Promise<Uint8Array | null>;
  onInvalidHydrateBytes?: () => void | Promise<void>;
  onAfterMutate?: (db: SqliteDb, sqlite3: SqliteWasm) => void;
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

function isUserSettingsSchemaReady(tableNames: string[]): boolean {
  return (
    tableNames.includes(USER_SETTINGS_META_TABLE_NAME) &&
    tableNames.includes(USER_SETTINGS_TABLE_NAME)
  );
}

function execMigrationScripts(db: SqliteDb, scripts: readonly string[]): void {
  for (const sql of scripts) {
    db.exec(sql);
  }
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
  };
}

function readSettingsRow(db: SqliteDb): UserSettingsRow {
  const rows = db.selectObjects(
    `SELECT
      globe_movement_smooth,
      camera_init_surface_offset_m,
      find_nearest_bathroom_max_dist_m
    FROM ${USER_SETTINGS_TABLE_NAME}
    WHERE id = 1`,
  );
  if (rows.length === 0) {
    return { ...USER_SETTINGS_DEFAULTS };
  }
  return rowToUserSettings(rows[0]!);
}

export function loadUserSettingsBytesIntoMemoryDb(
  sqlite3: SqliteWasm,
  db: SqliteDb,
  bytes: Uint8Array,
): void {
  if (!isSqliteDatabaseBytes(bytes)) {
    throw new Error("User settings hydrate bytes are not a SQLite database.");
  }

  const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
  try {
    const flags =
      (sqlite3.capi.SQLITE_DESERIALIZE_READWRITE ?? 2) |
      (sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE ?? 4);
    const rc = sqlite3.capi.sqlite3_deserialize(
      db.pointer,
      "main",
      pointer,
      bytes.byteLength,
      bytes.byteLength,
      flags,
    );
    if (rc !== 0) {
      throw new Error(`sqlite3_deserialize failed with code ${rc}`);
    }
  } finally {
    sqlite3.wasm.dealloc(pointer);
  }
}

function ensureFreshSchema(db: SqliteDb): void {
  if (isUserSettingsSchemaReady(listTableNames(db))) {
    return;
  }
  execMigrationScripts(db, USER_SETTINGS_MIGRATION_V0_TO_V1.forwardSql);
}

export function createUserSettingsDbSqlite(
  options: UserSettingsDbSqliteOptions,
): UserSettingsDbPort & {
  getSqliteDbForTests: () => Promise<SqliteDb>;
} {
  let db: SqliteDb | null = null;
  let sqlite3Module: SqliteWasm | null = null;
  let initPromise: Promise<void> | null = null;

  const ensureDb = async (): Promise<{ db: SqliteDb; sqlite3: SqliteWasm }> => {
    if (initPromise) {
      await initPromise;
    }
    if (!db || !sqlite3Module) {
      throw new Error("User settings database is not initialized.");
    }
    return { db, sqlite3: sqlite3Module };
  };

  const afterMutate = (activeDb: SqliteDb, sqlite3: SqliteWasm): void => {
    options.onAfterMutate?.(activeDb, sqlite3);
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
            ensureFreshSchema(memoryDb);
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
      return parseSchemaVersion(
        readMetaValue(activeDb, USER_SETTINGS_SCHEMA_VERSION_META_KEY),
      );
    },

    async getSettings(): Promise<UserSettingsRow> {
      const { db: activeDb } = await ensureDb();
      return readSettingsRow(activeDb);
    },

    async updateBooleanSetting(column, value): Promise<void> {
      const { db: activeDb, sqlite3 } = await ensureDb();
      activeDb.exec(
        `UPDATE ${USER_SETTINGS_TABLE_NAME} SET ${column} = ? WHERE id = 1`,
        { bind: [value ? 1 : 0] },
      );
      afterMutate(activeDb, sqlite3);
    },

    async updateIntSetting(column, value): Promise<void> {
      const { db: activeDb, sqlite3 } = await ensureDb();
      activeDb.exec(
        `UPDATE ${USER_SETTINGS_TABLE_NAME} SET ${column} = ? WHERE id = 1`,
        { bind: [value] },
      );
      afterMutate(activeDb, sqlite3);
    },

    async getSqliteDbForTests(): Promise<SqliteDb> {
      const { db: activeDb } = await ensureDb();
      return activeDb;
    },
  };
}
