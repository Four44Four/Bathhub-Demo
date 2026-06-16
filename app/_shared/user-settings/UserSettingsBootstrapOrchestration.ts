import {
  resolveUserSettingsSchemaBootstrapPhase,
  type UserSettingsSchemaBootstrapPhase,
} from "./UserSettingsSchemaBootstrap";

export type UserSettingsBootstrapAttemptOutcome = "done" | "retry" | "errored";

export function shouldScheduleUserSettingsBootstrapRetry(
  outcome: UserSettingsBootstrapAttemptOutcome,
  cancelled: boolean,
): boolean {
  return !cancelled && outcome === "retry";
}

export function resolveBootstrapPhaseAfterAttempt(
  persistentVersion: number | null,
  frontendVersion: number,
  migrationHasErrored: boolean,
): UserSettingsSchemaBootstrapPhase {
  return resolveUserSettingsSchemaBootstrapPhase(
    persistentVersion,
    frontendVersion,
    migrationHasErrored,
  );
}

export function shouldEnterSchemaOutOfDateDuringBootstrap(
  persistentVersion: number | null,
  frontendVersion: number,
): boolean {
  return (
    resolveUserSettingsSchemaBootstrapPhase(
      persistentVersion,
      frontendVersion,
      false,
    ) === "schema_out_of_date"
  );
}
