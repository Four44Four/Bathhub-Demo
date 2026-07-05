"use server";

import {
  resolveUserSettingsSchemaMigration,
  type UserSettingsSchemaMigrationResult,
} from "@/app/_shared/user-settings/UserSettingsSchemaMigration";
import { USER_SETTINGS_SCHEMA_MIGRATIONS } from "@/app/_shared/user-settings/migrations/v0-to-v1";
import { tryEnforceServerRateLimit } from "../rate-limit/enforceRateLimit";

/**
 * Returns the sequential migration SQL scripts to advance the client user-settings
 * schema by exactly one version, starting from `fromVersion`.
 */
export async function getUserSettingsSchemaMigration(
  fromVersion: number,
): Promise<UserSettingsSchemaMigrationResult> {
  const rateLimit = await tryEnforceServerRateLimit("user-settings-migration");
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "rate_limited",
      message: rateLimit.message,
    };
  }

  return resolveUserSettingsSchemaMigration(
    fromVersion,
    USER_SETTINGS_SCHEMA_MIGRATIONS,
  );
}
