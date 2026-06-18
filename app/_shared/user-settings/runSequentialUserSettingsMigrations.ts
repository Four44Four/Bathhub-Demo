import { execUserSettingsMigrationScripts } from "./execUserSettingsMigrationScripts";
import type { UserSettingsSchemaMigrationScripts } from "./UserSettingsSchemaMigration";

export type UserSettingsDbExec = (sql: string) => void;

export function requireUserSettingsMigrationForVersion(
  fromVersion: number,
  migrations: ReadonlyArray<UserSettingsSchemaMigrationScripts | undefined>,
): UserSettingsSchemaMigrationScripts {
  const migration = migrations[fromVersion];
  if (!migration) {
    throw new Error(
      `Missing user settings schema migration from version ${fromVersion} to ${fromVersion + 1}.`,
    );
  }
  return migration;
}

export function runSequentialUserSettingsMigrations(
  exec: UserSettingsDbExec,
  targetVersion: number,
  migrations: ReadonlyArray<UserSettingsSchemaMigrationScripts | undefined>,
): void {
  for (let fromVersion = 0; fromVersion < targetVersion; fromVersion++) {
    const migration = requireUserSettingsMigrationForVersion(fromVersion, migrations);
    execUserSettingsMigrationScripts(exec, migration.forwardSql);
  }
}
