"use client";

import { PrimaryButton } from "../PrimaryButton";
import { useUserSettings } from "../../user-settings/UserSettingsContext";

export const USER_SETTINGS_BTN_STR = "Edit user settings";
export const USER_SETTINGS_BTN_IMAGE_PATH = "/gear_icon.svg";

export function UserSettings() {
  const { openSettings } = useUserSettings();

  return (
    <PrimaryButton
      label={USER_SETTINGS_BTN_STR}
      imagePath={USER_SETTINGS_BTN_IMAGE_PATH}
      onClick={() => {
        openSettings();
      }}
    />
  );
}
