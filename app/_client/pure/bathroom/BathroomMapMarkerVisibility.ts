import {
  isBathroomPendingDeletion,
  type BathroomViewportEntry,
} from "../../../_shared/BathroomDataPrimary";
import type { UserSettingsRow } from "../../../_shared/user-settings/UserSettingsSchema";
import type { RenderedBathroomEntry } from "./RenderedBathrooms";

export type BathroomMapVisibilitySettings = Pick<
  UserSettingsRow,
  "show_non_verified_bathrooms_on_map" | "show_pending_deletion_bathrooms_on_map"
>;

/** Whether a bathroom entry should be shown as a map marker per user settings. */
export function shouldDisplayBathroomMarkerOnMap(
  entry: Pick<
    BathroomViewportEntry,
    "existence_value" | "deletion_wait_started_timestamp"
  >,
  settings: BathroomMapVisibilitySettings,
): boolean {
  if (
    !settings.show_non_verified_bathrooms_on_map &&
    entry.existence_value <= 0.0
  ) {
    return false;
  }

  if (
    !settings.show_pending_deletion_bathrooms_on_map &&
    isBathroomPendingDeletion(entry.deletion_wait_started_timestamp)
  ) {
    return false;
  }

  return true;
}

export function filterRenderedBathroomsForMapDisplay<
  T extends Pick<
    RenderedBathroomEntry,
    "existence_value" | "deletion_wait_started_timestamp"
  >,
>(entries: readonly T[], settings: BathroomMapVisibilitySettings): T[] {
  return entries.filter((entry) =>
    shouldDisplayBathroomMarkerOnMap(entry, settings),
  );
}
