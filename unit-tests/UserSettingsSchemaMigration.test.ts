import {
  resolveUserSettingsSchemaMigration,
} from "../app/_shared/user-settings/UserSettingsSchemaMigration";
import {
  USER_SETTINGS_MIGRATION_V0_TO_V1_DEFAULTS,
  USER_SETTINGS_SCHEMA_MIGRATIONS,
} from "../app/_shared/user-settings/migrations/v0-to-v1";

describe("resolveUserSettingsSchemaMigration", () => {
  test("rejects versions below 0 or above max", () => {
    expect(
      resolveUserSettingsSchemaMigration(-1, USER_SETTINGS_SCHEMA_MIGRATIONS),
    ).toEqual({
      ok: false,
      error: "invalid_version",
      message:
        "Invalid user settings schema version: -1. Valid range is 0 to 1.",
    });
    expect(
      resolveUserSettingsSchemaMigration(2, USER_SETTINGS_SCHEMA_MIGRATIONS),
    ).toEqual({
      ok: false,
      error: "invalid_version",
      message: "Invalid user settings schema version: 2. Valid range is 0 to 1.",
    });
  });

  test("reports already at max when requesting from version 1", () => {
    expect(
      resolveUserSettingsSchemaMigration(1, USER_SETTINGS_SCHEMA_MIGRATIONS),
    ).toEqual({
      ok: false,
      error: "already_at_max",
      message: "Client is already at the maximum user settings schema version (1).",
    });
  });

  test("returns v0 to v1 migration scripts", () => {
    const result = resolveUserSettingsSchemaMigration(
      0,
      USER_SETTINGS_SCHEMA_MIGRATIONS,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.fromVersion).toBe(0);
    expect(result.toVersion).toBe(1);
    expect(result.defaults).toEqual(USER_SETTINGS_MIGRATION_V0_TO_V1_DEFAULTS);
    expect(result.forwardSql.join("\n")).toContain("CREATE TABLE IF NOT EXISTS user_settings");
    expect(result.forwardSql.join("\n")).toContain(
      "INSERT OR REPLACE INTO user_settings_meta",
    );
  });
});
