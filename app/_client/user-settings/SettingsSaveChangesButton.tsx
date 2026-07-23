"use client";

import { useState, type CSSProperties } from "react";

import {
  BtnInteractAnim,
  SwipeMenu as SwipeMenuConsts,
  UserSettings as UserSettingsConsts,
} from "../ComponentConstants";
import { TextWeight } from "../Utils";

const SETTINGS_ACTION_BTN_BG_COLOR = "#FFFFFF";
const SETTINGS_ACTION_BTN_INTERACT_BG_COLOR = "#E6E6F0";
const SETTINGS_ACTION_BTN_FONT_COLOR = "#B5B5C4";
const SETTINGS_ACTION_BTN_FONT_SIZE = 13;
const SETTINGS_ACTION_BTN_SHADOW_ALPHA = 0.25;
const SAVE_SPINNER_BORDER_COLOR = "rgba(181, 181, 196, 0.35)";
const SAVE_SPINNER_ACCENT_COLOR = "#B5B5C4";

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
  isSaving: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function SettingsSaveChangesButton({
  isSaving,
  disabled = false,
  onClick,
}: SettingsSaveChangesButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = isHovered || isPressed;
  const interactTransition = `${BtnInteractAnim.BTN_INTERACT_DURA_MS}ms ease`;

  const interactFgBrightness = isHighlighted
    ? SwipeMenuConsts.BTN_INTERACT_FG_VALUE_FACTOR
    : 1;

  const buttonStyle: CSSProperties = {
    border: "none",
    borderRadius: 15,
    backgroundColor: isHighlighted
      ? SETTINGS_ACTION_BTN_INTERACT_BG_COLOR
      : SETTINGS_ACTION_BTN_BG_COLOR,
    color: SETTINGS_ACTION_BTN_FONT_COLOR,
    fontSize: SETTINGS_ACTION_BTN_FONT_SIZE,
    lineHeight: 1.2,
    cursor: disabled || isSaving ? "default" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: UserSettingsConsts.CLOSE_BTN_SIZE_PX,
    minWidth: 108,
    padding: "8px 16px",
    boxSizing: "border-box",
    boxShadow: `0 2px 8px rgba(18, 18, 47, ${SETTINGS_ACTION_BTN_SHADOW_ALPHA})`,
    transition: `background-color ${interactTransition}`,
    opacity: disabled ? 0.6 : 1,
  };

  const contentStyle: CSSProperties = {
    filter: `brightness(${interactFgBrightness})`,
    transition: `filter ${interactTransition}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: UserSettingsConsts.SAVE_BTN_SPINNER_SIZE_PX,
  };

  return (
    <button
      type="button"
      aria-label="Save changes"
      aria-busy={isSaving}
      disabled={disabled || isSaving}
      onClick={onClick}
      className={TextWeight.BOLD}
      style={buttonStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
    >
      <span style={contentStyle}>
        {isSaving ? <SaveChangesSpinner /> : "Save changes"}
      </span>
    </button>
  );
}
