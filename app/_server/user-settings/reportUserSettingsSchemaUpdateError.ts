"use server";

export type UserSettingsSchemaUpdateErrorPayload = {
  clientSchemaVersion: number;
  errorMessages: string[];
};

/**
 * Logs a client-side user-settings schema migration failure for server diagnostics.
 */
export async function reportUserSettingsSchemaUpdateError(
  payload: UserSettingsSchemaUpdateErrorPayload,
): Promise<void> {
  console.error(
    "[USER_SETTING_SCHEMA_UPDATE_ERROR]",
    `clientSchemaVersion=${payload.clientSchemaVersion}`,
    payload.errorMessages,
  );
}
