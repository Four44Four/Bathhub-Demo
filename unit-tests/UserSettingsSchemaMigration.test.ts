import {
  resolveUserSettingsSchemaMigration,
} from "../app/_shared/user-settings/UserSettingsSchemaMigration";
import {
  USER_SETTINGS_MIGRATION_V0_TO_V1_DEFAULTS,
} from "../app/_shared/user-settings/migrations/v0-to-v1";
import { USER_SETTINGS_SCHEMA_MIGRATIONS } from "../app/_shared/user-settings/migrations";
import { USER_SETTINGS_MIGRATION_V1_TO_V2_DEFAULTS } from "../app/_shared/user-settings/migrations/v1-to-v2";
import { USER_SETTINGS_MIGRATION_V2_TO_V3_DEFAULTS } from "../app/_shared/user-settings/migrations/v2-to-v3";
import { USER_SETTINGS_MIGRATION_V3_TO_V4_DEFAULTS } from "../app/_shared/user-settings/migrations/v3-to-v4";

describe("resolveUserSettingsSchemaMigration", () => {
  test("rejects versions below 0 or above max", () => {
    expect(
      resolveUserSettingsSchemaMigration(-1, USER_SETTINGS_SCHEMA_MIGRATIONS),
    ).toEqual({
      ok: false,
      error: "invalid_version",
      message:
        "Invalid user settings schema version: -1. Valid range is 0 to 4.",
    });
    expect(
      resolveUserSettingsSchemaMigration(5, USER_SETTINGS_SCHEMA_MIGRATIONS),
    ).toEqual({
      ok: false,
      error: "invalid_version",
      message: "Invalid user settings schema version: 5. Valid range is 0 to 4.",
    });
  });

  test("reports already at max when requesting from version 4", () => {
    expect(
      resolveUserSettingsSchemaMigration(4, USER_SETTINGS_SCHEMA_MIGRATIONS),
    ).toEqual({
      ok: false,
      error: "already_at_max",
      message: "Client is already at the maximum user settings schema version (4).",
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
    expect(result.forwardSql.join("\n")).toContain("CREATE TABLE user_settings");
    expect(result.forwardSql.join("\n")).not.toContain("IF NOT EXISTS");
    expect(result.forwardSql.join("\n")).toContain(
      "INSERT INTO user_settings_meta",
    );
    expect(result.forwardSql.join("\n")).not.toContain("OR IGNORE");
    expect(result.forwardSql.join("\n")).not.toContain("OR REPLACE");
  });

  test("returns v1 to v2 migration scripts", () => {
    const result = resolveUserSettingsSchemaMigration(
      1,
      USER_SETTINGS_SCHEMA_MIGRATIONS,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(2);
    expect(result.defaults).toEqual(USER_SETTINGS_MIGRATION_V1_TO_V2_DEFAULTS);
    expect(result.forwardSql.join("\n")).toContain(
      "find_nearest_bathroom_min_rating",
    );
    expect(result.forwardSql.join("\n")).toContain("SCHEMA_VERSION");
  });

  test("returns v2 to v3 migration scripts", () => {
    const result = resolveUserSettingsSchemaMigration(
      2,
      USER_SETTINGS_SCHEMA_MIGRATIONS,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.fromVersion).toBe(2);
    expect(result.toVersion).toBe(3);
    expect(result.defaults).toEqual(USER_SETTINGS_MIGRATION_V2_TO_V3_DEFAULTS);
    expect(result.forwardSql.join("\n")).toContain(
      "show_non_verified_bathrooms_on_map",
    );
    expect(result.forwardSql.join("\n")).toContain(
      "show_pending_deletion_bathrooms_on_map",
    );
    expect(result.forwardSql.join("\n")).toContain("SCHEMA_VERSION");
  });

  test("returns v3 to v4 migration scripts", () => {
    const result = resolveUserSettingsSchemaMigration(
      3,
      USER_SETTINGS_SCHEMA_MIGRATIONS,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.fromVersion).toBe(3);
    expect(result.toVersion).toBe(4);
    expect(result.defaults).toEqual(USER_SETTINGS_MIGRATION_V3_TO_V4_DEFAULTS);
    expect(result.forwardSql.join("\n")).toContain(
      "find_nearest_bathroom_factor_non_verified",
    );
    expect(result.forwardSql.join("\n")).toContain(
      "find_nearest_bathroom_factor_pending_deletion",
    );
    expect(result.forwardSql.join("\n")).toContain("SCHEMA_VERSION");
  });
});
