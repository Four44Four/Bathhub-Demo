"use client";

import { useState, type CSSProperties } from "react";

import { BtnInteractAnim } from "../ComponentConstants";
import { multiplyHexColorBrightness } from "../pure/viewport2d/ButtonInteractColor";
import { TextWeight } from "../Utils";
import { USER_SETTINGS_CLOSE_BTN_SIZE_PX } from "./UserSettingsConstants";

const SETTINGS_BACK_BTN_BG_COLOR = "#FFFFFF";
const SETTINGS_BACK_BTN_FONT_COLOR = "#B5B5C4";
const SETTINGS_BACK_BTN_FONT_SIZE = 13;
const SETTINGS_BACK_BTN_SHADOW_ALPHA = 0.25;

export type SettingsBackButtonProps = {
  onClick: () => void;
};

export function SettingsBackButton({ onClick }: SettingsBackButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = isHovered || isPressed;
  const interactTransition = `${BtnInteractAnim.BTN_INTERACT_DURA_MS}ms ease`;
  const brightnessMult = isHighlighted
    ? BtnInteractAnim.BTN_COLOR_VALUE_FACTOR_MULT
    : 1;

  const buttonStyle: CSSProperties = {
    border: "none",
    borderRadius: 15,
    backgroundColor: multiplyHexColorBrightness(
      SETTINGS_BACK_BTN_BG_COLOR,
      brightnessMult,
    ),
    color: multiplyHexColorBrightness(
      SETTINGS_BACK_BTN_FONT_COLOR,
      brightnessMult,
    ),
    fontSize: SETTINGS_BACK_BTN_FONT_SIZE,
    lineHeight: 1.2,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: USER_SETTINGS_CLOSE_BTN_SIZE_PX,
    minWidth: 72,
    padding: "8px 16px",
    boxSizing: "border-box",
    boxShadow: `0 2px 8px rgba(18, 18, 47, ${SETTINGS_BACK_BTN_SHADOW_ALPHA})`,
    transition: `background-color ${interactTransition}, color ${interactTransition}`,
  };

  return (
    <button
      type="button"
      aria-label="Back"
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
      Back
    </button>
  );
}
