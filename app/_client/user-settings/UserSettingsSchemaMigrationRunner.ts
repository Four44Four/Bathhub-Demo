import type { UserSettingsRow } from "@/app/_shared/user-settings/UserSettingsSchema";
import type { UserSettingsSchemaMigrationResult } from "@/app/_shared/user-settings/UserSettingsSchemaMigration";
import { getUserSettingsSchemaMigration } from "@/app/_server/user-settings/UserSettingsSchemaMigration";
import { reportUserSettingsSchemaUpdateError } from "@/app/_server/user-settings/reportUserSettingsSchemaUpdateError";
import {
  resolveUserSettingsMigrationFromVersion,
  shouldLoadUserSettingsFromPersistentDb,
  userSettingsSchemaIsAtFrontendVersion,
} from "@/app/_shared/user-settings/UserSettingsSchemaBootstrap";
import type { UserSettingsDbPort } from "../user-settings-db/UserSettingsDbSqlite";
import { USER_SETTINGS_FRONTEND_SCHEMA_VERSION } from "./UserSettingsSchemaVersion";
import {
  getActiveUserSettings,
  preloadActiveUserSettings,
  preloadActiveUserSettingsDefaults,
  setActiveUserSettings,
} from "./UserSettingsMemoryStore";

export type UserSettingsSchemaMigrationRunnerDeps = {
  getMigration: (fromVersion: number) => Promise<UserSettingsSchemaMigrationResult>;
  reportError: typeof reportUserSettingsSchemaUpdateError;
  preloadDefaults: (settings: UserSettingsRow) => void;
  onRateLimitViolation?: (errorMsg: string) => void;
};

export const defaultUserSettingsSchemaMigrationRunnerDeps: UserSettingsSchemaMigrationRunnerDeps =
  {
    getMigration: getUserSettingsSchemaMigration,
    reportError: reportUserSettingsSchemaUpdateError,
    preloadDefaults: preloadActiveUserSettings,
  };

export type UserSettingsMigrationRunResult =
  | { ok: true }
  | { ok: false; errorMessages: string[]; clientSchemaVersion: number };

export async function runUserSettingsSchemaMigrationStep(
  db: UserSettingsDbPort,
  fromVersion: number,
  deps: UserSettingsSchemaMigrationRunnerDeps = defaultUserSettingsSchemaMigrationRunnerDeps,
): Promise<UserSettingsMigrationRunResult> {
  const migration = await deps.getMigration(fromVersion);
  if (!migration.ok) {
    if (migration.error === "rate_limited") {
      deps.onRateLimitViolation?.(migration.message);
    }
    return {
      ok: false,
      errorMessages: [migration.message],
      clientSchemaVersion: fromVersion,
    };
  }

  deps.preloadDefaults(migration.defaults);

  try {
    await db.runForwardMigration(migration.forwardSql);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown migration error.";
    return {
      ok: false,
      errorMessages: [message],
      clientSchemaVersion: fromVersion,
    };
  }

  return { ok: true };
}

export async function migrateUserSettingsSchemaToFrontendVersion(
  db: UserSettingsDbPort,
  deps: UserSettingsSchemaMigrationRunnerDeps = defaultUserSettingsSchemaMigrationRunnerDeps,
): Promise<UserSettingsMigrationRunResult> {
  let persistentVersion = await db.getPersistentSchemaVersion();

  while (
    !userSettingsSchemaIsAtFrontendVersion(
      persistentVersion,
      USER_SETTINGS_FRONTEND_SCHEMA_VERSION,
    )
  ) {
    const fromVersion = resolveUserSettingsMigrationFromVersion(
      persistentVersion,
    );
    const step = await runUserSettingsSchemaMigrationStep(db, fromVersion, deps);
    if (!step.ok) {
      await deps.reportError({
        clientSchemaVersion: step.clientSchemaVersion,
        errorMessages: step.errorMessages,
      });
      return step;
    }
    persistentVersion = await db.getPersistentSchemaVersion();
  }

  return { ok: true };
}

export async function loadActiveUserSettingsFromPersistentDbIfAllowed(
  db: UserSettingsDbPort,
  migrationHasErrored: boolean,
): Promise<void> {
  const persistentVersion = await db.getPersistentSchemaVersion();
  if (
    !shouldLoadUserSettingsFromPersistentDb(
      persistentVersion,
      USER_SETTINGS_FRONTEND_SCHEMA_VERSION,
      migrationHasErrored,
    )
  ) {
    if (!migrationHasErrored) {
      preloadActiveUserSettingsDefaults();
    }
    return;
  }

  setActiveUserSettings(await db.readSettingsFromDb());
}

export async function saveActiveUserSettingsToPersistentDb(
  db: UserSettingsDbPort,
  settings = getActiveUserSettings(),
): Promise<void> {
  await db.saveSettingsToDb(settings);
  await db.persistToDisk();
}
