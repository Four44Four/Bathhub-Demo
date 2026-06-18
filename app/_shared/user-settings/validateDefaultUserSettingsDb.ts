import type { UserSettingsRow } from "./UserSettingsSchema";

export type DefaultUserSettingsDbValidationInput = {
  schemaVersion: number | null;
  settings: UserSettingsRow | null;
  expectedSchemaVersion: number;
  expectedDefaults: UserSettingsRow;
};

export type DefaultUserSettingsDbValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateDefaultUserSettingsDb(
  input: DefaultUserSettingsDbValidationInput,
): DefaultUserSettingsDbValidationResult {
  if (input.schemaVersion !== input.expectedSchemaVersion) {
    return {
      ok: false,
      reason: `Expected schema version ${input.expectedSchemaVersion}, got ${String(input.schemaVersion)}.`,
    };
  }

  if (input.settings == null) {
    return {
      ok: false,
      reason: "User settings row is missing from the default database.",
    };
  }

  const settingsMatch =
    input.settings.globe_movement_smooth ===
      input.expectedDefaults.globe_movement_smooth &&
    input.settings.camera_init_surface_offset_m ===
      input.expectedDefaults.camera_init_surface_offset_m &&
    input.settings.find_nearest_bathroom_max_dist_m ===
      input.expectedDefaults.find_nearest_bathroom_max_dist_m;

  if (!settingsMatch) {
    return {
      ok: false,
      reason: "Default user settings row does not match expected values.",
    };
  }

  return { ok: true };
}
