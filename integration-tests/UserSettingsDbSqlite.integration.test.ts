import {
  createUserSettingsDbSqlite,
  isUserSettingsSchemaReady,
  loadUserSettingsBytesIntoMemoryDb,
} from "../app/_client/user-settings-db/UserSettingsDbSqlite";
import type {
  SqliteDb,
  SqliteWasm,
} from "../app/_client/local-db/web/LocalDbSqlite";
import { USER_SETTINGS_SCHEMA_MIGRATIONS } from "../app/_shared/user-settings/migrations";
import { USER_SETTINGS_MIGRATION_V0_TO_V1 } from "../app/_shared/user-settings/migrations/v0-to-v1";
import { USER_SETTINGS_MIGRATION_V1_TO_V2 } from "../app/_shared/user-settings/migrations/v1-to-v2";
import {
  USER_SETTINGS_DEFAULTS,
  USER_SETTINGS_MAX_SCHEMA_VERSION,
  USER_SETTINGS_META_TABLE_NAME,
  USER_SETTINGS_SCHEMA_VERSION_META_KEY,
  USER_SETTINGS_TABLE_NAME,
  type UserSettingsRow,
  type UserSettingsRowSchemaV1,
} from "../app/_shared/user-settings/UserSettingsSchema";
import type { UserSettingsSchemaMigrationScripts } from "../app/_shared/user-settings/UserSettingsSchemaMigration";

const { loadSqliteWasmModule } = require("./sqliteWasmLoader.cjs") as {
  loadSqliteWasmModule: () => Promise<SqliteWasm>;
};

function listTableNames(db: SqliteDb): string[] {
  const rows = db.selectObjects(
    `SELECT name FROM sqlite_master WHERE type IN ('table', 'view')`,
  );
  return rows
    .map((row) => row.name)
    .filter((name): name is string => typeof name === "string");
}

function createTestDb(
  options: Parameters<typeof createUserSettingsDbSqlite>[0] = {},
): ReturnType<typeof createUserSettingsDbSqlite> {
  return createUserSettingsDbSqlite({
    initSqliteWasm: loadSqliteWasmModule,
    ...options,
  });
}

async function initMigratedDb(
  options: Parameters<typeof createUserSettingsDbSqlite>[0] = {},
): Promise<ReturnType<typeof createUserSettingsDbSqlite>> {
  return initDbAtSchemaVersion(USER_SETTINGS_MAX_SCHEMA_VERSION, options);
}

function migrationPairLabel(fromVersion: number, toVersion: number): string {
  return `v${fromVersion}→v${toVersion}`;
}

function requireSequentialMigration(
  fromVersion: number,
): UserSettingsSchemaMigrationScripts {
  const toVersion = fromVersion + 1;
  const migration = USER_SETTINGS_SCHEMA_MIGRATIONS[fromVersion];
  if (!migration) {
    throw new Error(
      `Missing user settings schema migration for ${migrationPairLabel(fromVersion, toVersion)}.`,
    );
  }
  return migration;
}

async function runSequentialMigrationStep(
  db: ReturnType<typeof createUserSettingsDbSqlite>,
  fromVersion: number,
): Promise<void> {
  const toVersion = fromVersion + 1;
  const migration = requireSequentialMigration(fromVersion);
  try {
    await db.runForwardMigration(migration.forwardSql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `User settings schema migration failed for ${migrationPairLabel(fromVersion, toVersion)}: ${message}`,
    );
  }
}

async function initDbAtSchemaVersion(
  targetVersion: number,
  options: Parameters<typeof createUserSettingsDbSqlite>[0] = {},
): Promise<ReturnType<typeof createUserSettingsDbSqlite>> {
  const db = createTestDb(options);
  await db.init();
  for (let fromVersion = 0; fromVersion < targetVersion; fromVersion++) {
    await runSequentialMigrationStep(db, fromVersion);
  }
  return db;
}

const SEQUENTIAL_MIGRATION_PAIRS = Array.from(
  { length: USER_SETTINGS_MAX_SCHEMA_VERSION },
  (_, fromVersion) => [fromVersion, fromVersion + 1] as const,
);
const DATA_PRESERVATION_MIGRATION_PAIRS = SEQUENTIAL_MIGRATION_PAIRS.filter(
  ([fromVersion]) => fromVersion > 0,
);

/** Non-default values used to detect data loss during schema-altering migrations. */
const CUSTOM_SETTINGS_FOR_MIGRATION_TEST: UserSettingsRow = {
  globe_movement_smooth: false,
  camera_init_surface_offset_m: 3200,
  find_nearest_bathroom_max_dist_m: 750,
  find_nearest_bathroom_min_rating: 2.5,
};

const CUSTOM_SETTINGS_SCHEMA_V1_FOR_MIGRATION_TEST: UserSettingsRowSchemaV1 = {
  globe_movement_smooth: false,
  camera_init_surface_offset_m: 3200,
  find_nearest_bathroom_max_dist_m: 750,
};

type RawUserSettingsSqliteRow = {
  globe_movement_smooth: number;
  camera_init_surface_offset_m: number;
  find_nearest_bathroom_max_dist_m: number;
  find_nearest_bathroom_min_rating: number;
};

function userSettingsRowToRawSqlite(
  settings: UserSettingsRow | UserSettingsRowSchemaV1,
): RawUserSettingsSqliteRow | Omit<RawUserSettingsSqliteRow, "find_nearest_bathroom_min_rating"> {
  return {
    globe_movement_smooth: settings.globe_movement_smooth ? 1 : 0,
    camera_init_surface_offset_m: settings.camera_init_surface_offset_m,
    find_nearest_bathroom_max_dist_m: settings.find_nearest_bathroom_max_dist_m,
    ...("find_nearest_bathroom_min_rating" in settings
      ? {
          find_nearest_bathroom_min_rating:
            settings.find_nearest_bathroom_min_rating,
        }
      : {}),
  };
}

function readRawSettingsRow(
  sqliteDb: SqliteDb,
): RawUserSettingsSqliteRow | Omit<RawUserSettingsSqliteRow, "find_nearest_bathroom_min_rating"> {
  const columnRows = sqliteDb.selectObjects(
    `SELECT name FROM pragma_table_info(?)`,
    [USER_SETTINGS_TABLE_NAME],
  );
  const columns = columnRows
    .map((row) => row.name)
    .filter((name): name is string => typeof name === "string");
  const hasMinRating = columns.includes("find_nearest_bathroom_min_rating");
  const selectSql = hasMinRating
    ? `SELECT
      globe_movement_smooth,
      camera_init_surface_offset_m,
      find_nearest_bathroom_max_dist_m,
      find_nearest_bathroom_min_rating
    FROM ${USER_SETTINGS_TABLE_NAME}
    WHERE id = 1`
    : `SELECT
      globe_movement_smooth,
      camera_init_surface_offset_m,
      find_nearest_bathroom_max_dist_m
    FROM ${USER_SETTINGS_TABLE_NAME}
    WHERE id = 1`;
  const rows = sqliteDb.selectObjects(selectSql);
  if (rows.length === 0) {
    throw new Error("User settings row is missing from persistent SQLite.");
  }
  const row = rows[0]!;
  const base = {
    globe_movement_smooth: Number(row.globe_movement_smooth),
    camera_init_surface_offset_m: Number(row.camera_init_surface_offset_m),
    find_nearest_bathroom_max_dist_m: Number(
      row.find_nearest_bathroom_max_dist_m,
    ),
  };
  if (!hasMinRating) {
    return base;
  }
  return {
    ...base,
    find_nearest_bathroom_min_rating: Number(
      row.find_nearest_bathroom_min_rating,
    ),
  };
}

async function expectUserSettingsTableContains(
  db: ReturnType<typeof createUserSettingsDbSqlite>,
  expected: UserSettingsRow | UserSettingsRowSchemaV1,
): Promise<void> {
  const sqliteDb = await db.getSqliteDbForTests();
  const raw = readRawSettingsRow(sqliteDb);
  if ("find_nearest_bathroom_min_rating" in expected) {
    expect(await db.readSettingsFromDb()).toEqual(expected);
    expect(raw).toEqual(userSettingsRowToRawSqlite(expected));
    return;
  }

  expect(raw).toEqual(userSettingsRowToRawSqlite(expected));
}

function expectedSettingsAfterForwardMigration(
  fromVersion: number,
  migration: UserSettingsSchemaMigrationScripts,
  settingsBeforeMigration: UserSettingsRow | UserSettingsRowSchemaV1 | null,
): UserSettingsRow | UserSettingsRowSchemaV1 {
  if (fromVersion === 0) {
    return migration.defaults;
  }
  if (settingsBeforeMigration == null) {
    throw new Error(
      `Migration from v${fromVersion} requires seeded settings to verify data preservation.`,
    );
  }
  return {
    ...migration.defaults,
    ...settingsBeforeMigration,
  };
}

describe("UserSettingsDbSqlite — real sqlite-wasm layer (user_settings spec §56–75, §103)", () => {
  describe("initialization before migration", () => {
    test("reports no schema version and unreadable settings on a fresh db", async () => {
      const db = createTestDb();
      await db.init();

      expect(await db.getPersistentSchemaVersion()).toBeNull();
      await expect(db.readSettingsFromDb()).rejects.toThrow();

      const sqliteDb = await db.getSqliteDbForTests();
      expect(isUserSettingsSchemaReady(listTableNames(sqliteDb))).toBe(false);
    });
  });

  describe("sequential schema version migrations (user_settings spec §141–148)", () => {
    test("defines a migration script for every sequential pair up to max schema version", () => {
      for (let fromVersion = 0; fromVersion < USER_SETTINGS_MAX_SCHEMA_VERSION; fromVersion++) {
        const toVersion = fromVersion + 1;
        const migration = USER_SETTINGS_SCHEMA_MIGRATIONS[fromVersion];
        expect(migration).toBeDefined();
        expect(migration!.forwardSql.length).toBeGreaterThan(0);
        expect(migration!.defaults).toBeDefined();
        if (!migration) {
          throw new Error(
            `Missing user settings schema migration for ${migrationPairLabel(fromVersion, toVersion)}.`,
          );
        }
      }
    });

    test.each(SEQUENTIAL_MIGRATION_PAIRS)(
      "forward migration succeeds for %i→%i and user_settings table contains expected values",
      async (fromVersion, toVersion) => {
        const migration = requireSequentialMigration(fromVersion);
        const db = await initDbAtSchemaVersion(fromVersion);

        expect(await db.getPersistentSchemaVersion()).toBe(
          fromVersion === 0 ? null : fromVersion,
        );

        let settingsBeforeMigration: UserSettingsRow | UserSettingsRowSchemaV1 | null =
          null;
        if (fromVersion > 0) {
          settingsBeforeMigration =
            fromVersion === 1
              ? CUSTOM_SETTINGS_SCHEMA_V1_FOR_MIGRATION_TEST
              : CUSTOM_SETTINGS_FOR_MIGRATION_TEST;
          if (fromVersion === 1) {
            const sqliteDb = await db.getSqliteDbForTests();
            sqliteDb.exec(
              `UPDATE ${USER_SETTINGS_TABLE_NAME}
               SET globe_movement_smooth = ?,
                   camera_init_surface_offset_m = ?,
                   find_nearest_bathroom_max_dist_m = ?
               WHERE id = 1`,
              {
                bind: [
                  settingsBeforeMigration.globe_movement_smooth ? 1 : 0,
                  settingsBeforeMigration.camera_init_surface_offset_m,
                  settingsBeforeMigration.find_nearest_bathroom_max_dist_m,
                ],
              },
            );
          } else {
            await db.saveSettingsToDb(
              settingsBeforeMigration as UserSettingsRow,
            );
          }
          await expectUserSettingsTableContains(db, settingsBeforeMigration);
        }

        await runSequentialMigrationStep(db, fromVersion);

        expect(await db.getPersistentSchemaVersion()).toBe(toVersion);

        const sqliteDb = await db.getSqliteDbForTests();
        expect(isUserSettingsSchemaReady(listTableNames(sqliteDb))).toBe(true);
        await expectUserSettingsTableContains(
          db,
          expectedSettingsAfterForwardMigration(
            fromVersion,
            migration,
            settingsBeforeMigration,
          ),
        );
      },
    );

    test(`migrates sequentially from v0 to v${USER_SETTINGS_MAX_SCHEMA_VERSION} with expected table values at each version`, async () => {
      const db = createTestDb();
      await db.init();

      for (let fromVersion = 0; fromVersion < USER_SETTINGS_MAX_SCHEMA_VERSION; fromVersion++) {
        const toVersion = fromVersion + 1;
        const migration = requireSequentialMigration(fromVersion);
        await runSequentialMigrationStep(db, fromVersion);
        expect(await db.getPersistentSchemaVersion()).toBe(toVersion);
        await expectUserSettingsTableContains(db, migration.defaults);
      }
    });

    if (DATA_PRESERVATION_MIGRATION_PAIRS.length > 0) {
      test.each(DATA_PRESERVATION_MIGRATION_PAIRS)(
        "forward migration %i→%i preserves existing user setting data through schema changes",
        async (fromVersion) => {
          const migration = requireSequentialMigration(fromVersion);
          const db = await initDbAtSchemaVersion(fromVersion);
          const settingsBeforeMigration =
            fromVersion === 1
              ? CUSTOM_SETTINGS_SCHEMA_V1_FOR_MIGRATION_TEST
              : CUSTOM_SETTINGS_FOR_MIGRATION_TEST;
          if (fromVersion === 1) {
            const sqliteDb = await db.getSqliteDbForTests();
            sqliteDb.exec(
              `UPDATE ${USER_SETTINGS_TABLE_NAME}
               SET globe_movement_smooth = ?,
                   camera_init_surface_offset_m = ?,
                   find_nearest_bathroom_max_dist_m = ?
               WHERE id = 1`,
              {
                bind: [
                  settingsBeforeMigration.globe_movement_smooth ? 1 : 0,
                  settingsBeforeMigration.camera_init_surface_offset_m,
                  settingsBeforeMigration.find_nearest_bathroom_max_dist_m,
                ],
              },
            );
          } else {
            await db.saveSettingsToDb(
              settingsBeforeMigration as UserSettingsRow,
            );
          }
          await expectUserSettingsTableContains(
            db,
            settingsBeforeMigration,
          );

          await runSequentialMigrationStep(db, fromVersion);

          await expectUserSettingsTableContains(
            db,
            expectedSettingsAfterForwardMigration(
              fromVersion,
              migration,
              settingsBeforeMigration,
            ),
          );
        },
      );
    }
  });

  describe("v0→v1 migration", () => {
    test("forward migration creates schema tables and persists SCHEMA_VERSION=1", async () => {
      const db = await initDbAtSchemaVersion(1);

      expect(await db.getPersistentSchemaVersion()).toBe(1);

      const sqliteDb = await db.getSqliteDbForTests();
      expect(isUserSettingsSchemaReady(listTableNames(sqliteDb))).toBe(true);

      const metaRows = sqliteDb.selectObjects(
        `SELECT value FROM ${USER_SETTINGS_META_TABLE_NAME} WHERE key = ?`,
        [USER_SETTINGS_SCHEMA_VERSION_META_KEY],
      );
      expect(metaRows[0]?.value).toBe("1");
    });

    test("readSettingsFromDb returns migration defaults after forward migration", async () => {
      const db = await initDbAtSchemaVersion(1);
      await expectUserSettingsTableContains(
        db,
        USER_SETTINGS_MIGRATION_V0_TO_V1.defaults,
      );
    });

    test("repeat forward migration aborts on duplicate actions and leaves schema unchanged", async () => {
      const db = createTestDb();
      await db.init();
      await runSequentialMigrationStep(db, 0);

      const settingsBeforeRepeat: UserSettingsRowSchemaV1 = {
        globe_movement_smooth: false,
        camera_init_surface_offset_m: 4200,
        find_nearest_bathroom_max_dist_m: 1200,
      };
      const sqliteDb = await db.getSqliteDbForTests();
      sqliteDb.exec(
        `UPDATE ${USER_SETTINGS_TABLE_NAME}
         SET globe_movement_smooth = ?,
             camera_init_surface_offset_m = ?,
             find_nearest_bathroom_max_dist_m = ?
         WHERE id = 1`,
        {
          bind: [
            settingsBeforeRepeat.globe_movement_smooth ? 1 : 0,
            settingsBeforeRepeat.camera_init_surface_offset_m,
            settingsBeforeRepeat.find_nearest_bathroom_max_dist_m,
          ],
        },
      );
      await expectUserSettingsTableContains(db, settingsBeforeRepeat);
      expect(await db.getPersistentSchemaVersion()).toBe(1);

      await expect(
        db.runForwardMigration(USER_SETTINGS_MIGRATION_V0_TO_V1.forwardSql),
      ).rejects.toThrow(/user_settings_meta already exist/i);

      expect(await db.getPersistentSchemaVersion()).toBe(1);
      await expectUserSettingsTableContains(db, settingsBeforeRepeat);
    });

    test("partial forward migration is rolled back atomically", async () => {
      const db = createTestDb();
      await db.init();

      const [createMeta, createSettings] =
        USER_SETTINGS_MIGRATION_V0_TO_V1.forwardSql;
      await expect(
        db.runForwardMigration([
          createMeta!,
          createSettings!,
          "THIS IS NOT VALID SQL;",
        ]),
      ).rejects.toThrow();

      const sqliteDb = await db.getSqliteDbForTests();
      const tableNames = listTableNames(sqliteDb);
      expect(tableNames).not.toContain(USER_SETTINGS_META_TABLE_NAME);
      expect(tableNames).not.toContain(USER_SETTINGS_TABLE_NAME);
      expect(await db.getPersistentSchemaVersion()).toBeNull();
    });

  });

  describe("v1→v2 migration", () => {
    test("forward migration adds find_nearest_bathroom_min_rating and persists SCHEMA_VERSION=2", async () => {
      const db = await initDbAtSchemaVersion(1);
      await runSequentialMigrationStep(db, 1);

      expect(await db.getPersistentSchemaVersion()).toBe(2);
      await expectUserSettingsTableContains(
        db,
        USER_SETTINGS_MIGRATION_V1_TO_V2.defaults,
      );
    });

    test("repeat forward migration aborts on duplicate column and leaves schema unchanged", async () => {
      const db = await initDbAtSchemaVersion(2);
      const settingsBeforeRepeat: UserSettingsRow = {
        ...CUSTOM_SETTINGS_FOR_MIGRATION_TEST,
      };
      await db.saveSettingsToDb(settingsBeforeRepeat);
      await expectUserSettingsTableContains(db, settingsBeforeRepeat);

      await expect(
        db.runForwardMigration(USER_SETTINGS_MIGRATION_V1_TO_V2.forwardSql),
      ).rejects.toThrow(/duplicate column name/i);

      expect(await db.getPersistentSchemaVersion()).toBe(2);
      await expectUserSettingsTableContains(db, settingsBeforeRepeat);
    });
  });

  describe("saveSettingsToDb / readSettingsFromDb round-trip", () => {
    const customSettings: UserSettingsRow = {
      globe_movement_smooth: false,
      camera_init_surface_offset_m: 3200,
      find_nearest_bathroom_max_dist_m: 750,
      find_nearest_bathroom_min_rating: 3.5,
    };

    test("persists and reads all setting columns", async () => {
      const db = await initMigratedDb();
      await db.saveSettingsToDb(customSettings);
      expect(await db.readSettingsFromDb()).toEqual(customSettings);
    });

    test("boolean true round-trips as INTEGER 1 in SQLite", async () => {
      const db = await initMigratedDb();
      await db.saveSettingsToDb({
        ...USER_SETTINGS_DEFAULTS,
        globe_movement_smooth: true,
      });

      const sqliteDb = await db.getSqliteDbForTests();
      const rows = sqliteDb.selectObjects(
        `SELECT globe_movement_smooth FROM ${USER_SETTINGS_TABLE_NAME} WHERE id = 1`,
      );
      expect(rows[0]?.globe_movement_smooth).toBe(1);
      expect((await db.readSettingsFromDb()).globe_movement_smooth).toBe(true);
    });
  });

  describe("CHECK constraints (user_settings spec §125–140)", () => {
    let previousSqliteWarn: (...args: unknown[]) => void;

    beforeEach(async () => {
      const sqlite3 = await loadSqliteWasmModule();
      previousSqliteWarn = sqlite3.config.warn;
      sqlite3.config.warn = () => {};
    });

    afterEach(async () => {
      const sqlite3 = await loadSqliteWasmModule();
      sqlite3.config.warn = previousSqliteWarn;
    });

    test("rejects camera_init_surface_offset_m below minimum", async () => {
      const db = await initMigratedDb();
      await expect(
        db.saveSettingsToDb({
          ...USER_SETTINGS_DEFAULTS,
          camera_init_surface_offset_m: 499,
        }),
      ).rejects.toThrow();
    });

    test("rejects camera_init_surface_offset_m above maximum", async () => {
      const db = await initMigratedDb();
      await expect(
        db.saveSettingsToDb({
          ...USER_SETTINGS_DEFAULTS,
          camera_init_surface_offset_m: 10001,
        }),
      ).rejects.toThrow();
    });

    test("rejects find_nearest_bathroom_max_dist_m below minimum", async () => {
      const db = await initMigratedDb();
      await expect(
        db.saveSettingsToDb({
          ...USER_SETTINGS_DEFAULTS,
          find_nearest_bathroom_max_dist_m: -1,
        }),
      ).rejects.toThrow();
    });

    test("rejects find_nearest_bathroom_max_dist_m above maximum", async () => {
      const db = await initMigratedDb();
      await expect(
        db.saveSettingsToDb({
          ...USER_SETTINGS_DEFAULTS,
          find_nearest_bathroom_max_dist_m: 10001,
        }),
      ).rejects.toThrow();
    });

    test("rejects find_nearest_bathroom_min_rating below minimum", async () => {
      const db = await initMigratedDb();
      await expect(
        db.saveSettingsToDb({
          ...USER_SETTINGS_DEFAULTS,
          find_nearest_bathroom_min_rating: -0.1,
        }),
      ).rejects.toThrow();
    });

    test("rejects find_nearest_bathroom_min_rating above maximum", async () => {
      const db = await initMigratedDb();
      await expect(
        db.saveSettingsToDb({
          ...USER_SETTINGS_DEFAULTS,
          find_nearest_bathroom_min_rating: 5.1,
        }),
      ).rejects.toThrow();
    });

    test("rejects invalid globe_movement_smooth values via direct SQL", async () => {
      const db = await initMigratedDb();
      const sqliteDb = await db.getSqliteDbForTests();
      expect(() =>
        sqliteDb.exec(
          `UPDATE ${USER_SETTINGS_TABLE_NAME} SET globe_movement_smooth = 2 WHERE id = 1`,
        ),
      ).toThrow();
    });
  });

  describe("SCHEMA_VERSION parsing", () => {
    test("getPersistentSchemaVersion returns null for non-numeric meta values", async () => {
      const db = await initMigratedDb();
      const sqliteDb = await db.getSqliteDbForTests();
      sqliteDb.exec(
        `UPDATE ${USER_SETTINGS_META_TABLE_NAME} SET value = ? WHERE key = ?`,
        { bind: ["not-a-version", USER_SETTINGS_SCHEMA_VERSION_META_KEY] },
      );
      expect(await db.getPersistentSchemaVersion()).toBeNull();
    });
  });

  describe("hydrate from persisted SQLite bytes", () => {
    test("init restores a migrated database from exported bytes", async () => {
      let exportedBytes: Uint8Array | null = null;
      const sourceDb = createTestDb({
        onAfterPersist: async (activeDb, sqlite3) => {
          exportedBytes = sqlite3.capi.sqlite3_js_db_export(activeDb);
        },
      });
      await sourceDb.init();
      for (const migration of USER_SETTINGS_SCHEMA_MIGRATIONS) {
        if (migration) {
          await sourceDb.runForwardMigration(migration.forwardSql);
        }
      }
      const savedSettings: UserSettingsRow = {
        globe_movement_smooth: false,
        camera_init_surface_offset_m: 4200,
        find_nearest_bathroom_max_dist_m: 1200,
        find_nearest_bathroom_min_rating: 1.5,
      };
      await sourceDb.saveSettingsToDb(savedSettings);
      expect(exportedBytes).not.toBeNull();

      const hydratedDb = createTestDb({
        hydrateFromBytes: async () => exportedBytes,
      });
      await hydratedDb.init();

      expect(await hydratedDb.getPersistentSchemaVersion()).toBe(
        USER_SETTINGS_MAX_SCHEMA_VERSION,
      );
      expect(await hydratedDb.readSettingsFromDb()).toEqual(savedSettings);
    });

    test("loadUserSettingsBytesIntoMemoryDb rejects non-sqlite bytes", async () => {
      const sqlite3 = await loadSqliteWasmModule();
      const memoryDb = new sqlite3.oo1.DB(":memory:");
      expect(() =>
        loadUserSettingsBytesIntoMemoryDb(
          sqlite3,
          memoryDb,
          new Uint8Array([0, 1, 2, 3]),
        ),
      ).toThrow("not a SQLite database");
    });
  });
});
