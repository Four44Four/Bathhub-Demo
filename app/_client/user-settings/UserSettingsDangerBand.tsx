"use client";

import { TextWeight } from "../Utils";
import {
  USER_SETTINGS_DANGER_BAND_BG_COLOR,
  USER_SETTINGS_DANGER_BAND_TEXT_COLOR,
} from "./UserSettingsConstants";
import { useUserSettings } from "./UserSettingsContext";

export function UserSettingsDangerBand() {
  const { schemaUpdateHasErrored } = useUserSettings();

  if (!schemaUpdateHasErrored) {
    return null;
  }

  return (
    <div
      className={TextWeight.BOLD}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        backgroundColor: USER_SETTINGS_DANGER_BAND_BG_COLOR,
        color: USER_SETTINGS_DANGER_BAND_TEXT_COLOR,
        fontSize: 13,
        lineHeight: 1.3,
        textAlign: "center",
        padding: "8px 12px",
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      Danger: user settings cannot be changed
    </div>
  );
}
