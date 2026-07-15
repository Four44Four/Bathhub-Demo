"use client";

import { useState } from "react";

import { UserSettings as UserSettingsConsts } from "../ComponentConstants";
import {
  userSettingsRowHoverBrightnessFactor,
  userSettingsRowHoverStyle,
} from "../pure/user-settings/UserSettingsRowHoverStyle";

export function useUserSettingsRowHover(disabled = false) {
  const [isHovered, setIsHovered] = useState(false);
  const brightnessFactor = userSettingsRowHoverBrightnessFactor(
    isHovered,
    disabled,
    UserSettingsConsts.ROW_HOVER_BRIGHTNESS_FACTOR,
  );

  return {
    rowHoverProps: disabled
      ? {}
      : {
          onMouseEnter: () => setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        },
    rowHoverStyle: userSettingsRowHoverStyle(
      brightnessFactor,
      UserSettingsConsts.PAGE_BG,
      UserSettingsConsts.ROW_HOVER_TRANSITION_MS,
    ),
  };
}
