"use client";

import { useState, type CSSProperties } from "react";

import { BtnInteractAnim, Shared } from "../ComponentConstants";
import { TextWeight } from "../Utils";
import {
  USER_SETTINGS_CLOSE_BTN_FILL,
  USER_SETTINGS_CLOSE_BTN_INTERACT_FILL,
  USER_SETTINGS_CLOSE_BTN_SIZE_PX,
  USER_SETTINGS_CLOSE_BTN_TEXT,
} from "./UserSettingsConstants";

export type SettingsCloseButtonProps = {
  onClick: () => void;
};

export function SettingsCloseButton({ onClick }: SettingsCloseButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = isHovered || isPressed;
  const interactTransition = `${BtnInteractAnim.BTN_INTERACT_DURA_MS}ms ease`;

  const buttonStyle: CSSProperties = {
    width: USER_SETTINGS_CLOSE_BTN_SIZE_PX,
    height: USER_SETTINGS_CLOSE_BTN_SIZE_PX,
    borderRadius: "50%",
    border: "none",
    backgroundColor: isHighlighted
      ? USER_SETTINGS_CLOSE_BTN_INTERACT_FILL
      : USER_SETTINGS_CLOSE_BTN_FILL,
    color: USER_SETTINGS_CLOSE_BTN_TEXT,
    fontSize: 22,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(18, 18, 47, 0.25)",
    zIndex: 1,
    transition: `background-color ${interactTransition}`,
    padding: 0,
  };

  const interactFgBrightness = isHighlighted ? Shared.FG_COLOR_VALUE_FACTOR : 1;

  const contentStyle: CSSProperties = {
    filter: `brightness(${interactFgBrightness})`,
    transition: `filter ${interactTransition}`,
  };

  return (
    <button
      type="button"
      aria-label="Close settings"
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
      <span style={contentStyle}>×</span>
    </button>
  );
}
