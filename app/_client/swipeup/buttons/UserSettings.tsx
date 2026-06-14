"use client";

import { PrimaryButton } from "../PrimaryButton";
import * as ServerDebug from "../../../_server/Debug";

export const USER_SETTINGS_BTN_STR = "Edit user settings";
export const USER_SETTINGS_BTN_IMAGE_PATH = "/gear_icon.svg";

export function UserSettings() {
  return (
    <PrimaryButton
      label={USER_SETTINGS_BTN_STR}
      imagePath={USER_SETTINGS_BTN_IMAGE_PATH}
      onClick={() => {
        const debugStr = "CHANGE THIS LATER";
        ServerDebug.log(debugStr);
        console.log(debugStr);
      }}
    />
  );
}
