import {
  USER_SETTINGS_MAX_SCHEMA_VERSION,
  type UserSettingsRow,
  type UserSettingsRowSchemaV1,
} from "./UserSettingsSchema";

export type UserSettingsSchemaMigrationScripts = {
  forwardSql: readonly string[];
  /** Defaults for the target schema version after this migration completes. */
  defaults: UserSettingsRow | UserSettingsRowSchemaV1;
};

export type UserSettingsSchemaMigrationSuccess = {
  ok: true;
  fromVersion: number;
  toVersion: number;
  forwardSql: readonly string[];
  defaults: UserSettingsRow | UserSettingsRowSchemaV1;
};

export type UserSettingsSchemaMigrationErrorCode =
  | "invalid_version"
  | "already_at_max"
  | "rate_limited";

export type UserSettingsSchemaMigrationFailure = {
  ok: false;
  error: UserSettingsSchemaMigrationErrorCode;
  message: string;
};

export type UserSettingsSchemaMigrationResult =
  | UserSettingsSchemaMigrationSuccess
  | UserSettingsSchemaMigrationFailure;

/**
 * Resolves the single-step migration from `fromVersion` to `fromVersion + 1`.
 * `migrations[fromVersion]` must contain the scripts for that step.
 */
export function resolveUserSettingsSchemaMigration(
  fromVersion: number,
  migrations: ReadonlyArray<UserSettingsSchemaMigrationScripts | undefined>,
): UserSettingsSchemaMigrationResult {
  if (
    !Number.isInteger(fromVersion) ||
    fromVersion < 0 ||
    fromVersion > USER_SETTINGS_MAX_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      error: "invalid_version",
      message: `Invalid user settings schema version: ${fromVersion}. Valid range is 0 to ${USER_SETTINGS_MAX_SCHEMA_VERSION}.`,
    };
  }

  if (fromVersion === USER_SETTINGS_MAX_SCHEMA_VERSION) {
    return {
      ok: false,
      error: "already_at_max",
      message: `Client is already at the maximum user settings schema version (${USER_SETTINGS_MAX_SCHEMA_VERSION}).`,
    };
  }

  const step = migrations[fromVersion];
  if (!step) {
    return {
      ok: false,
      error: "invalid_version",
      message: `No migration is defined from user settings schema version ${fromVersion}.`,
    };
  }

  return {
    ok: true,
    fromVersion,
    toVersion: fromVersion + 1,
    forwardSql: step.forwardSql,
    defaults: step.defaults,
  };
}
