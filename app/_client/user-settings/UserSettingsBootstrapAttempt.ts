import {
  resolveUserSettingsMigrationFromVersion,
  resolveUserSettingsSchemaBootstrapPhase,
} from "@/app/_shared/user-settings/UserSettingsSchemaBootstrap";
import type { UserSettingsDbPort } from "../user-settings-db/UserSettingsDbSqlite";
import { installInitialUserSettingsDbFromServer } from "../user-settings-db/installInitialUserSettingsDbFromServer";
import { USER_SETTINGS_FRONTEND_SCHEMA_VERSION } from "./UserSettingsSchemaVersion";
import {
  loadActiveUserSettingsFromPersistentDbIfAllowed,
  migrateUserSettingsSchemaToFrontendVersion,
  type UserSettingsMigrationRunResult,
} from "./UserSettingsSchemaMigrationRunner";
import type { UserSettingsBootstrapAttemptOutcome } from "@/app/_shared/user-settings/UserSettingsBootstrapOrchestration";

export type UserSettingsBootstrapFinishReady = (
  migrationHasErrored: boolean,
) => Promise<void>;

export async function attemptUserSettingsSchemaBootstrap(
  db: UserSettingsDbPort,
  finishReady: UserSettingsBootstrapFinishReady,
  frontendVersion: number = USER_SETTINGS_FRONTEND_SCHEMA_VERSION,
): Promise<UserSettingsBootstrapAttemptOutcome> {
  await db.init();

  let persistentVersion = await db.getPersistentSchemaVersion();
  const initialInstall = await installInitialUserSettingsDbFromServer(db);
  if (initialInstall.ok) {
    persistentVersion = await db.getPersistentSchemaVersion();
  }

  const initialPhase = resolveUserSettingsSchemaBootstrapPhase(
    persistentVersion,
    frontendVersion,
    false,
  );
  if (initialPhase === "ready") {
    await finishReady(false);
    return "done";
  }

  const migration = await migrateUserSettingsSchemaToFrontendVersion(db);
  if (!migration.ok) {
    await finishReady(true);
    return "errored";
  }

  await finishReady(false);
  return "done";
}

export async function finishUserSettingsBootstrapReady(
  db: UserSettingsDbPort,
  migrationHasErrored: boolean,
  frontendVersion: number = USER_SETTINGS_FRONTEND_SCHEMA_VERSION,
): Promise<ReturnType<typeof resolveUserSettingsSchemaBootstrapPhase>> {
  await loadActiveUserSettingsFromPersistentDbIfAllowed(db, migrationHasErrored);
  const persistentVersion = await db.getPersistentSchemaVersion();
  return resolveUserSettingsSchemaBootstrapPhase(
    persistentVersion,
    frontendVersion,
    migrationHasErrored,
  );
}

export function resolveNextMigrationFromVersion(
  persistentVersion: number | null,
): number {
  return resolveUserSettingsMigrationFromVersion(persistentVersion);
}

export type { UserSettingsMigrationRunResult };
