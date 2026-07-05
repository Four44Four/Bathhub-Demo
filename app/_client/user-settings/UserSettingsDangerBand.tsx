"use client";

import { BandAlert } from "../viewport2d/alerts/BandAlert";
import { USER_SETTINGS_DANGER_BAND_MESSAGE } from "./UserSettingsConstants";
import { useUserSettings } from "./UserSettingsContext";

export function UserSettingsDangerBand() {
  const { schemaUpdateHasErrored } = useUserSettings();

  if (!schemaUpdateHasErrored) {
    return null;
  }

  return (
    <BandAlert message={USER_SETTINGS_DANGER_BAND_MESSAGE} persistUntilRemoved />
  );
}
