"use client";

import { type CSSProperties } from "react";

import { UserSettings as UserSettingsConsts } from "../ComponentConstants";
import {
  userSettingsActionButtonOuterHeightPx,
  userSettingsActionButtonOuterWidthPx,
} from "../pure/user-settings/UserSettingsBottomButtonLayout";
import { TextWeight } from "../Utils";
import { Button } from "../viewport2d/Button";

const SAVE_SPINNER_BORDER_COLOR = "rgba(181, 181, 196, 0.35)";
const SAVE_SPINNER_ACCENT_COLOR = "#B5B5C4";

const SAVE_CHANGES_BUTTON_MIN_WIDTH_PX = userSettingsActionButtonOuterWidthPx(
  "Save changes",
  UserSettingsConsts.ACTION_BUTTON_PADDING_HORIZONTAL_PX,
  UserSettingsConsts.ACTION_BUTTON_OUTLINE_THICKNESS_PX,
);
const SAVE_CHANGES_BUTTON_MIN_HEIGHT_PX = userSettingsActionButtonOuterHeightPx(
  UserSettingsConsts.ACTION_BUTTON_PADDING_VERTICAL_PX,
  UserSettingsConsts.ACTION_BUTTON_OUTLINE_THICKNESS_PX,
);

function SaveChangesSpinner() {
  const sizePx = UserSettingsConsts.SAVE_BTN_SPINNER_SIZE_PX;
  const style: CSSProperties = {
    width: sizePx,
    height: sizePx,
    borderRadius: "50%",
    border: `2px solid ${SAVE_SPINNER_BORDER_COLOR}`,
    borderTopColor: SAVE_SPINNER_ACCENT_COLOR,
    animation: "settings-save-spinner-spin 0.8s linear infinite",
    boxSizing: "border-box",
    flexShrink: 0,
  };

  return (
    <>
      <style>{`
        @keyframes settings-save-spinner-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div aria-hidden="true" style={style} />
    </>
  );
}

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
      {isSaving ? <SaveChangesSpinner /> : null}
    </Button>
  );
}
