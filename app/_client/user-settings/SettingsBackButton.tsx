"use client";

import { UserSettings as UserSettingsConsts } from "../ComponentConstants";
import { TextWeight } from "../Utils";
import { Button } from "../viewport2d/Button";

export type SettingsBackButtonProps = {
  anchorElement: HTMLElement | null;
  x: number;
  y: number;
  onClick: () => void;
};

export function SettingsBackButton({
  anchorElement,
  x,
  y,
  onClick,
}: SettingsBackButtonProps) {
  return (
    <Button
      anchorElement={anchorElement}
      x={x}
      y={y}
      text="Back"
      textWeight={TextWeight.BOLD}
      hoverInteractBehavior="darken"
      fillColor={UserSettingsConsts.PAGE_BG}
      textColor={UserSettingsConsts.SETTINGS_BACK_BTN_FONT_COLOR}
      outlineThickness={UserSettingsConsts.ACTION_BUTTON_OUTLINE_THICKNESS_PX}
      cornerRadius={UserSettingsConsts.BOTTOM_BUTTON_CORNER_RADIUS_PX}
      padding={UserSettingsConsts.ACTION_BUTTON_PADDING_VERTICAL_PX}
      dropShadow={UserSettingsConsts.BOTTOM_BUTTON_DROP_SHADOW}
      ignoreViewportInteractionGuards
      ariaLabel="Back"
      onClick={onClick}
    />
  );
}
