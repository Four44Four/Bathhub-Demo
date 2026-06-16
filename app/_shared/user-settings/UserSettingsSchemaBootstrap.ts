export type UserSettingsSchemaBootstrapPhase =
  | "ready"
  | "schema_out_of_date"
  | "migration_errored";

export function resolveUserSettingsSchemaBootstrapPhase(
  persistentVersion: number | null,
  frontendVersion: number,
  migrationHasErrored: boolean,
): UserSettingsSchemaBootstrapPhase {
  if (migrationHasErrored) {
    return "migration_errored";
  }
  if (
    persistentVersion == null ||
    persistentVersion !== frontendVersion
  ) {
    return "schema_out_of_date";
  }
  return "ready";
}

export function resolveUserSettingsMigrationFromVersion(
  persistentVersion: number | null,
): number {
  if (persistentVersion == null) {
    return 0;
  }
  return persistentVersion;
}

export function shouldLoadUserSettingsFromPersistentDb(
  persistentVersion: number | null,
  frontendVersion: number,
  migrationHasErrored: boolean,
): boolean {
  if (migrationHasErrored) {
    return false;
  }
  return (
    persistentVersion != null && persistentVersion === frontendVersion
  );
}

export function userSettingsSchemaIsAtFrontendVersion(
  persistentVersion: number | null,
  frontendVersion: number,
): boolean {
  return (
    persistentVersion != null && persistentVersion === frontendVersion
  );
}
