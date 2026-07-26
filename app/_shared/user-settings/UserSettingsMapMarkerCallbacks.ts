import type { UserSettingsRow } from "./UserSettingsSchema";

export type BathroomMapVisibilityUserSettings = Pick<
  UserSettingsRow,
  "show_non_verified_bathrooms_on_map" | "show_pending_deletion_bathrooms_on_map"
>;

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
