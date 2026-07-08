"use client";

import { UserSettings as UserSettingsConsts } from "../ComponentConstants";
import { BandAlert } from "../viewport2d/alerts/BandAlert";
import { useUserSettings } from "./UserSettingsContext";

export function UserSettingsDangerBand() {
  const { schemaUpdateHasErrored } = useUserSettings();

  if (!schemaUpdateHasErrored) {
    return null;
  }

  return (
    <BandAlert message={UserSettingsConsts.DANGER_BAND_MESSAGE} persistUntilRemoved />
  );
}
