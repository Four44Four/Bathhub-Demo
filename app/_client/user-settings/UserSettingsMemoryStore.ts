import {
  USER_SETTINGS_DEFAULTS,
  type UserSettingsRow,
} from "@/app/_shared/user-settings/UserSettingsSchema";
import { cloneUserSettingsRow } from "@/app/_shared/user-settings/UserSettingsRowUtils";

let activeUserSettings: UserSettingsRow = cloneUserSettingsRow(
  USER_SETTINGS_DEFAULTS,
);

export function getActiveUserSettings(): UserSettingsRow {
  return activeUserSettings;
}

export function setActiveUserSettings(settings: UserSettingsRow): void {
  activeUserSettings = cloneUserSettingsRow(settings);
}

export function preloadActiveUserSettingsDefaults(): void {
  setActiveUserSettings(USER_SETTINGS_DEFAULTS);
}

export function preloadActiveUserSettings(settings: UserSettingsRow): void {
  setActiveUserSettings(settings);
}
