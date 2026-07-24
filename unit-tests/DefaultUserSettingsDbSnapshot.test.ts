import {
  requireUserSettingsMigrationForVersion,
  runSequentialUserSettingsMigrations,
} from "../app/_shared/user-settings/runSequentialUserSettingsMigrations";
import { USER_SETTINGS_MIGRATION_V0_TO_V1 } from "../app/_shared/user-settings/migrations/v0-to-v1";
import { validateDefaultUserSettingsDb } from "../app/_shared/user-settings/validateDefaultUserSettingsDb";
import { USER_SETTINGS_DEFAULTS } from "../app/_shared/user-settings/UserSettingsSchema";
import { shouldInstallInitialUserSettingsDbFromServer } from "../app/_shared/user-settings/installInitialUserSettingsDb";

describe("runSequentialUserSettingsMigrations", () => {
  test("runs each migration script in order", () => {
    const executed: string[] = [];
    runSequentialUserSettingsMigrations(
      (sql) => {
        executed.push(sql);
      },
      1,
      [USER_SETTINGS_MIGRATION_V0_TO_V1],
    );

    expect(executed).toEqual([
      "BEGIN",
      ...USER_SETTINGS_MIGRATION_V0_TO_V1.forwardSql,
      "COMMIT",
    ]);
  });

  test("throws when a migration step is missing", () => {
    expect(() =>
      requireUserSettingsMigrationForVersion(2, [USER_SETTINGS_MIGRATION_V0_TO_V1]),
    ).toThrow("Missing user settings schema migration from version 2 to 3.");
  });
});

describe("validateDefaultUserSettingsDb", () => {
  test("accepts matching schema version and defaults", () => {
    expect(
      validateDefaultUserSettingsDb({
        schemaVersion: 2,
        settings: USER_SETTINGS_DEFAULTS,
        expectedSchemaVersion: 2,
        expectedDefaults: USER_SETTINGS_DEFAULTS,
      }),
    ).toEqual({ ok: true });
  });

  test("rejects mismatched schema versions", () => {
    expect(
      validateDefaultUserSettingsDb({
        schemaVersion: 0,
        settings: USER_SETTINGS_DEFAULTS,
        expectedSchemaVersion: 2,
        expectedDefaults: USER_SETTINGS_DEFAULTS,
      }),
    ).toEqual({
      ok: false,
      reason: "Expected schema version 2, got 0.",
    });
  });
});

describe("shouldInstallInitialUserSettingsDbFromServer", () => {
  test("installs only when there is no local DB and no schema version", () => {
    expect(shouldInstallInitialUserSettingsDbFromServer(null, false)).toBe(true);
    expect(shouldInstallInitialUserSettingsDbFromServer(null, true)).toBe(false);
    expect(shouldInstallInitialUserSettingsDbFromServer(2, false)).toBe(false);
  });
});
