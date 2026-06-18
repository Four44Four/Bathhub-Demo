import {
  USER_SETTINGS_DEFAULTS,
  type UserSettingsRow,
} from "../app/_shared/user-settings/UserSettingsSchema";
import { USER_SETTINGS_MIGRATION_V0_TO_V1 } from "../app/_shared/user-settings/migrations/v0-to-v1";
import type { UserSettingsDbPort } from "../app/_client/user-settings-db/UserSettingsDbSqlite";
import {
  finishUserSettingsBootstrapReady,
  attemptUserSettingsSchemaBootstrap,
} from "../app/_client/user-settings/UserSettingsBootstrapAttempt";
import {
  getActiveUserSettings,
  preloadActiveUserSettingsDefaults,
  setActiveUserSettings,
} from "../app/_client/user-settings/UserSettingsMemoryStore";
import {
  loadActiveUserSettingsFromPersistentDbIfAllowed,
  migrateUserSettingsSchemaToFrontendVersion,
  runUserSettingsSchemaMigrationStep,
  saveActiveUserSettingsToPersistentDb,
  type UserSettingsSchemaMigrationRunnerDeps,
} from "../app/_client/user-settings/UserSettingsSchemaMigrationRunner";

function createMockDb(
  overrides: Partial<UserSettingsDbPort> = {},
): UserSettingsDbPort {
  let schemaVersion: number | null = overrides.getPersistentSchemaVersion
    ? null
    : 0;
  let storedSettings: UserSettingsRow = { ...USER_SETTINGS_DEFAULTS };

  return {
    init: jest.fn(async () => {}),
    getPersistentSchemaVersion: jest.fn(async () => schemaVersion),
    readSettingsFromDb: jest.fn(async () => storedSettings),
    saveSettingsToDb: jest.fn(async (settings) => {
      storedSettings = settings;
    }),
    runForwardMigration: jest.fn(async () => {
      schemaVersion = 1;
    }),
    persistToDisk: jest.fn(async () => {}),
    hadLocalPersistentDbAtStartup: jest.fn(async () => false),
    replaceDbFromBytes: jest.fn(async () => {
      schemaVersion = 1;
    }),
    ...overrides,
  };
}

function createMigrationDeps(
  overrides: Partial<UserSettingsSchemaMigrationRunnerDeps> = {},
): UserSettingsSchemaMigrationRunnerDeps {
  return {
    getMigration: jest.fn(async () => ({
      ok: true as const,
      fromVersion: 0,
      toVersion: 1,
      forwardSql: USER_SETTINGS_MIGRATION_V0_TO_V1.forwardSql,
      defaults: USER_SETTINGS_MIGRATION_V0_TO_V1.defaults,
    })),
    reportError: jest.fn(async () => {}),
    preloadDefaults: jest.fn(() => {}),
    ...overrides,
  };
}

describe("UserSettingsSchemaMigrationRunner", () => {
  beforeEach(() => {
    preloadActiveUserSettingsDefaults();
  });

  test("preloads defaults before running forward migration SQL", async () => {
    const order: string[] = [];
    const db = createMockDb();
    const deps = createMigrationDeps({
      preloadDefaults: () => {
        order.push("preload");
      },
      getMigration: async () => {
        order.push("fetch-migration");
        return {
          ok: true as const,
          fromVersion: 0,
          toVersion: 1,
          forwardSql: USER_SETTINGS_MIGRATION_V0_TO_V1.forwardSql,
          defaults: USER_SETTINGS_MIGRATION_V0_TO_V1.defaults,
        };
      },
    });
    db.runForwardMigration = jest.fn(async () => {
      order.push("sql");
    });

    await runUserSettingsSchemaMigrationStep(db, 0, deps);

    expect(order).toEqual(["fetch-migration", "preload", "sql"]);
  });

  test("reports migration failures from migrateUserSettingsSchemaToFrontendVersion", async () => {
    const db = createMockDb({
      runForwardMigration: jest.fn(async () => {
        throw new Error("boom");
      }),
    });
    const deps = createMigrationDeps();

    const result = await migrateUserSettingsSchemaToFrontendVersion(db, deps);

    expect(result).toEqual({
      ok: false,
      errorMessages: ["boom"],
      clientSchemaVersion: 0,
    });
    expect(deps.reportError).toHaveBeenCalledWith({
      clientSchemaVersion: 0,
      errorMessages: ["boom"],
    });
  });

  test("migrates sequentially until the persistent schema matches the frontend version", async () => {
    let schemaVersion: number | null = 0;
    const db = createMockDb({
      getPersistentSchemaVersion: jest.fn(async () => schemaVersion),
      runForwardMigration: jest.fn(async () => {
        schemaVersion = 1;
      }),
    });
    const deps = createMigrationDeps();

    const result = await migrateUserSettingsSchemaToFrontendVersion(db, deps);

    expect(result).toEqual({ ok: true });
    expect(deps.getMigration).toHaveBeenCalledWith(0);
    expect(schemaVersion).toBe(1);
  });

  test("does not load persistent settings when versions mismatch or migration errored", async () => {
    const db = createMockDb({
      getPersistentSchemaVersion: jest.fn(async () => 0),
      readSettingsFromDb: jest.fn(async () => ({
        globe_movement_smooth: false,
        camera_init_surface_offset_m: 1234,
        find_nearest_bathroom_max_dist_m: 567,
      })),
    });

    await loadActiveUserSettingsFromPersistentDbIfAllowed(db, false);
    expect(getActiveUserSettings()).toEqual(USER_SETTINGS_DEFAULTS);

    await loadActiveUserSettingsFromPersistentDbIfAllowed(db, true);
    expect(getActiveUserSettings()).toEqual(USER_SETTINGS_DEFAULTS);
  });

  test("loads persistent settings only when versions match and migration has not errored", async () => {
    const customSettings: UserSettingsRow = {
      globe_movement_smooth: false,
      camera_init_surface_offset_m: 1234,
      find_nearest_bathroom_max_dist_m: 567,
    };
    const db = createMockDb({
      getPersistentSchemaVersion: jest.fn(async () => 1),
      readSettingsFromDb: jest.fn(async () => customSettings),
    });

    await loadActiveUserSettingsFromPersistentDbIfAllowed(db, false);
    expect(getActiveUserSettings()).toEqual(customSettings);
  });

  test("saveActiveUserSettingsToPersistentDb writes pending values to SQLite and memory only when saved", async () => {
    const db = createMockDb({
      getPersistentSchemaVersion: jest.fn(async () => 1),
    });
    const pending: UserSettingsRow = {
      ...USER_SETTINGS_DEFAULTS,
      globe_movement_smooth: false,
    };

    expect(getActiveUserSettings().globe_movement_smooth).toBe(true);

    await saveActiveUserSettingsToPersistentDb(db, pending);
    setActiveUserSettings(pending);

    expect(db.saveSettingsToDb).toHaveBeenCalledWith(pending);
    expect(db.persistToDisk).toHaveBeenCalled();
    expect(getActiveUserSettings().globe_movement_smooth).toBe(false);
  });
});

describe("attemptUserSettingsSchemaBootstrap", () => {
  beforeEach(() => {
    preloadActiveUserSettingsDefaults();
  });

  test("finishes ready without migrating when schema versions already match", async () => {
    const db = createMockDb({
      getPersistentSchemaVersion: jest.fn(async () => 1),
    });
    const finishReady = jest.fn(async () => {});

    const outcome = await attemptUserSettingsSchemaBootstrap(db, finishReady, 1);

    expect(outcome).toBe("done");
    expect(finishReady).toHaveBeenCalledWith(false);
    expect(db.runForwardMigration).not.toHaveBeenCalled();
  });

  test("migrates and finishes ready when schema is behind the frontend version", async () => {
    let schemaVersion: number | null = 0;
    const db = createMockDb({
      getPersistentSchemaVersion: jest.fn(async () => schemaVersion),
      runForwardMigration: jest.fn(async () => {
        schemaVersion = 1;
      }),
    });
    const finishReady = jest.fn(async (migrationHasErrored) => {
      const phase = await finishUserSettingsBootstrapReady(
        db,
        migrationHasErrored,
        1,
      );
      expect(phase).toBe("ready");
    });

    const outcome = await attemptUserSettingsSchemaBootstrap(db, finishReady, 1);

    expect(outcome).toBe("done");
    expect(finishReady).toHaveBeenCalledWith(false);
  });

  test("returns errored and finishes with migration_errored phase when SQL migration fails", async () => {
    const db = createMockDb({
      runForwardMigration: jest.fn(async () => {
        throw new Error("migration failed");
      }),
    });
    const finishReady = jest.fn(async (migrationHasErrored) => {
      const phase = await finishUserSettingsBootstrapReady(
        db,
        migrationHasErrored,
        1,
      );
      expect(phase).toBe("migration_errored");
    });

    const outcome = await attemptUserSettingsSchemaBootstrap(db, finishReady, 1);

    expect(outcome).toBe("errored");
    expect(finishReady).toHaveBeenCalledWith(true);
  });
});
