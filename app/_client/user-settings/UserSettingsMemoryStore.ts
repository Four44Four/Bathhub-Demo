import {
  USER_SETTINGS_DEFAULTS,
  type UserSettingsRow,
} from "@/app/_shared/user-settings/UserSettingsSchema";
import { cloneUserSettingsRow } from "@/app/_shared/user-settings/UserSettingsRowUtils";
import {
  type BathroomMapVisibilityUserSettings,
  pickBathroomMapVisibilitySettings,
} from "@/app/_shared/user-settings/UserSettingsMapMarkerCallbacks";

let activeUserSettings: UserSettingsRow = cloneUserSettingsRow(
  USER_SETTINGS_DEFAULTS,
);

let bathroomMapVisibilityPreview: BathroomMapVisibilityUserSettings | null =
  null;

export function getActiveUserSettings(): UserSettingsRow {
  return activeUserSettings;
}

export function setActiveUserSettings(settings: UserSettingsRow): void {
  activeUserSettings = cloneUserSettingsRow(settings);
}

export function setBathroomMapVisibilityPreview(
  preview: BathroomMapVisibilityUserSettings | null,
): void {
  bathroomMapVisibilityPreview = preview
    ? { ...preview }
    : null;
}

export function getBathroomMapMarkerVisibilitySettings(): BathroomMapVisibilityUserSettings {
  if (bathroomMapVisibilityPreview !== null) {
    return bathroomMapVisibilityPreview;
  }
  return pickBathroomMapVisibilitySettings(activeUserSettings);
}

export function preloadActiveUserSettingsDefaults(): void {
  setActiveUserSettings(USER_SETTINGS_DEFAULTS);
}

export function preloadActiveUserSettings(settings: UserSettingsRow): void {
  setActiveUserSettings(settings);
}
