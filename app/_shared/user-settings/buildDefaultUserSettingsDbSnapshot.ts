import { USER_SETTINGS_SCHEMA_MIGRATIONS } from "./migrations/v0-to-v1";
import { runSequentialUserSettingsMigrations } from "./runSequentialUserSettingsMigrations";
import {
  USER_SETTINGS_MAX_SCHEMA_VERSION,
  type UserSettingsRow,
} from "./UserSettingsSchema";
import type { UserSettingsSchemaMigrationScripts } from "./UserSettingsSchemaMigration";
import { validateDefaultUserSettingsDb } from "./validateDefaultUserSettingsDb";

export type UserSettingsDbExec = (sql: string) => void;

export type UserSettingsDbSnapshotReader = {
  exec: UserSettingsDbExec;
  readSchemaVersion: () => number | null;
  readSettings: () => UserSettingsRow;
};

export function buildDefaultUserSettingsDbSnapshot(
  db: UserSettingsDbSnapshotReader,
  targetVersion: number = USER_SETTINGS_MAX_SCHEMA_VERSION,
  migrations: ReadonlyArray<UserSettingsSchemaMigrationScripts | undefined> = USER_SETTINGS_SCHEMA_MIGRATIONS,
): void {
  runSequentialUserSettingsMigrations(db.exec, targetVersion, migrations);
}

export function validateBuiltDefaultUserSettingsDbSnapshot(
  db: UserSettingsDbSnapshotReader,
  targetVersion: number = USER_SETTINGS_MAX_SCHEMA_VERSION,
  migrations: ReadonlyArray<UserSettingsSchemaMigrationScripts | undefined> = USER_SETTINGS_SCHEMA_MIGRATIONS,
): ReturnType<typeof validateDefaultUserSettingsDb> {
  const expectedDefaults = migrations[targetVersion - 1]?.defaults;
  if (!expectedDefaults) {
    return {
      ok: false,
      reason: `Missing defaults for user settings schema version ${targetVersion}.`,
    };
  }

  return validateDefaultUserSettingsDb({
    schemaVersion: db.readSchemaVersion(),
    settings: db.readSettings(),
    expectedSchemaVersion: targetVersion,
    expectedDefaults,
  });
}

export function buildAndValidateDefaultUserSettingsDbSnapshot(
  db: UserSettingsDbSnapshotReader,
  targetVersion: number = USER_SETTINGS_MAX_SCHEMA_VERSION,
  migrations: ReadonlyArray<UserSettingsSchemaMigrationScripts | undefined> = USER_SETTINGS_SCHEMA_MIGRATIONS,
): ReturnType<typeof validateDefaultUserSettingsDb> {
  buildDefaultUserSettingsDbSnapshot(db, targetVersion, migrations);
  return validateBuiltDefaultUserSettingsDbSnapshot(db, targetVersion, migrations);
}
