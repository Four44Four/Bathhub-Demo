"use client";

import { UserSettings as UserSettingsConsts } from "../ComponentConstants";
import {
  userSettingsActionButtonOuterHeightPx,
  userSettingsActionButtonOuterWidthPx,
} from "../pure/user-settings/UserSettingsBottomButtonLayout";
import { TextWeight } from "../Utils";
import { Button } from "../viewport2d/Button";
import { LoadingSpinner } from "../viewport2d/LoadingSpinner";

const SAVE_CHANGES_BUTTON_MIN_WIDTH_PX = userSettingsActionButtonOuterWidthPx(
  "Save changes",
  UserSettingsConsts.ACTION_BUTTON_PADDING_HORIZONTAL_PX,
  UserSettingsConsts.ACTION_BUTTON_OUTLINE_THICKNESS_PX,
);
const SAVE_CHANGES_BUTTON_MIN_HEIGHT_PX = userSettingsActionButtonOuterHeightPx(
  UserSettingsConsts.ACTION_BUTTON_PADDING_VERTICAL_PX,
  UserSettingsConsts.ACTION_BUTTON_OUTLINE_THICKNESS_PX,
);

export type SettingsSaveChangesButtonProps = {
  x: number;
  y: number;
  isSaving: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function SettingsSaveChangesButton({
  x,
  y,
  isSaving,
  disabled = false,
  onClick,
}: SettingsSaveChangesButtonProps) {
  return (
    <Button
      x={x}
      y={y}
      text={isSaving ? null : "Save changes"}
      textWeight={TextWeight.BOLD}
      hoverInteractBehavior="darken"
      fillColor={UserSettingsConsts.PAGE_BG}
      textColor={UserSettingsConsts.SETTINGS_BACK_BTN_FONT_COLOR}
      outlineThickness={UserSettingsConsts.ACTION_BUTTON_OUTLINE_THICKNESS_PX}
      cornerRadius={UserSettingsConsts.BOTTOM_BUTTON_CORNER_RADIUS_PX}
      padding={UserSettingsConsts.ACTION_BUTTON_PADDING_VERTICAL_PX}
      minWidthPx={SAVE_CHANGES_BUTTON_MIN_WIDTH_PX}
      minHeightPx={SAVE_CHANGES_BUTTON_MIN_HEIGHT_PX}
      boxShadow={UserSettingsConsts.BOTTOM_BUTTON_BOX_SHADOW}
      ignoreViewportInteractionGuards
      busy={isSaving}
      disabled={disabled}
      ariaLabel="Save changes"
      onClick={onClick}
    >
      {isSaving ? (
        <LoadingSpinner
          accentColor={UserSettingsConsts.SAVE_CHANGES_LOADING_SPINNER_ACCENT_COLOR}
          baseColor={UserSettingsConsts.SAVE_CHANGES_LOADING_SPINNER_BASE_COLOR}
          radiusPx={UserSettingsConsts.SAVE_CHANGES_LOADING_SPINNER_RADIUS_PX}
        />
      ) : null}
    </Button>
  );
}
