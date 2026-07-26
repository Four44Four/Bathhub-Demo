import type { UserSettingsRow } from "./UserSettingsSchema";

export type BathroomMapVisibilityUserSettings = Pick<
  UserSettingsRow,
  "show_non_verified_bathrooms_on_map" | "show_pending_deletion_bathrooms_on_map"
>;

export const BATHROOM_MAP_VISIBILITY_SETTING_COLUMNS = [
  "show_non_verified_bathrooms_on_map",
  "show_pending_deletion_bathrooms_on_map",
] as const satisfies ReadonlyArray<keyof BathroomMapVisibilityUserSettings>;

export type BathroomMapVisibilitySettingColumn =
  (typeof BATHROOM_MAP_VISIBILITY_SETTING_COLUMNS)[number];

export function isBathroomMapVisibilitySettingColumn(
  column: keyof UserSettingsRow,
): column is BathroomMapVisibilitySettingColumn {
  return (BATHROOM_MAP_VISIBILITY_SETTING_COLUMNS as readonly string[]).includes(
    column,
  );
}

export function pickBathroomMapVisibilitySettings(
  settings: UserSettingsRow,
): BathroomMapVisibilityUserSettings {
  return {
    show_non_verified_bathrooms_on_map:
      settings.show_non_verified_bathrooms_on_map,
    show_pending_deletion_bathrooms_on_map:
      settings.show_pending_deletion_bathrooms_on_map,
  };
}

/** Whether saving settings should trigger a bathroom map marker rerender. */
export function bathroomMapVisibilitySettingsChanged(
  previous: BathroomMapVisibilityUserSettings,
  next: BathroomMapVisibilityUserSettings,
): boolean {
  return (
    previous.show_non_verified_bathrooms_on_map !==
      next.show_non_verified_bathrooms_on_map ||
    previous.show_pending_deletion_bathrooms_on_map !==
      next.show_pending_deletion_bathrooms_on_map
  );
}
