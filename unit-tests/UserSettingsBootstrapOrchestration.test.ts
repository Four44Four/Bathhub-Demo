import {
  resolveBootstrapPhaseAfterAttempt,
  shouldEnterSchemaOutOfDateDuringBootstrap,
  shouldScheduleUserSettingsBootstrapRetry,
} from "../app/_shared/user-settings/UserSettingsBootstrapOrchestration";
import { USER_SETTINGS_SCHEMA_RETRY_INTERVAL_MS } from "../app/_client/user-settings/UserSettingsSchemaMigrationRunner";

describe("UserSettingsBootstrapOrchestration", () => {
  test("enters schema_out_of_date when persistent and frontend versions differ", () => {
    expect(shouldEnterSchemaOutOfDateDuringBootstrap(0, 1)).toBe(true);
    expect(shouldEnterSchemaOutOfDateDuringBootstrap(null, 1)).toBe(true);
    expect(shouldEnterSchemaOutOfDateDuringBootstrap(1, 1)).toBe(false);
  });

  test("resolves bootstrap phase after a successful migration", () => {
    expect(resolveBootstrapPhaseAfterAttempt(1, 1, false)).toBe("ready");
  });

  test("resolves bootstrap phase to migration_errored after a failed migration", () => {
    expect(resolveBootstrapPhaseAfterAttempt(0, 1, true)).toBe(
      "migration_errored",
    );
  });

  test("schedules bootstrap retry only for retry outcomes while not cancelled", () => {
    expect(shouldScheduleUserSettingsBootstrapRetry("retry", false)).toBe(true);
    expect(shouldScheduleUserSettingsBootstrapRetry("retry", true)).toBe(false);
    expect(shouldScheduleUserSettingsBootstrapRetry("done", false)).toBe(false);
    expect(shouldScheduleUserSettingsBootstrapRetry("errored", false)).toBe(
      false,
    );
  });

  test("exports a retry interval for schema update polling", () => {
    expect(USER_SETTINGS_SCHEMA_RETRY_INTERVAL_MS).toBeGreaterThan(0);
  });
});
