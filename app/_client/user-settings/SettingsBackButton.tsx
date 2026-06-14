"use client";

import { useState, type CSSProperties } from "react";

import {
  BtnInteractAnim,
  SwipeMenu as SwipeMenuConsts,
} from "../ComponentConstants";
import { TextWeight } from "../Utils";
import { USER_SETTINGS_CLOSE_BTN_SIZE_PX } from "./UserSettingsConstants";

const SETTINGS_BACK_BTN_BG_COLOR = "#FFFFFF";
const SETTINGS_BACK_BTN_INTERACT_BG_COLOR = "#E6E6F0";
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

  const interactFgBrightness = isHighlighted
    ? SwipeMenuConsts.BTN_INTERACT_FG_VALUE_FACTOR
    : 1;

  const buttonStyle: CSSProperties = {
    border: "none",
    borderRadius: 15,
    backgroundColor: isHighlighted
      ? SETTINGS_BACK_BTN_INTERACT_BG_COLOR
      : SETTINGS_BACK_BTN_BG_COLOR,
    color: SETTINGS_BACK_BTN_FONT_COLOR,
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
    transition: `background-color ${interactTransition}`,
  };

  const contentStyle: CSSProperties = {
    filter: `brightness(${interactFgBrightness})`,
    transition: `filter ${interactTransition}`,
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
      <span style={contentStyle}>Back</span>
    </button>
  );
}
