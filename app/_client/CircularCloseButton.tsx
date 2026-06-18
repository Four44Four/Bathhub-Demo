"use client";

import { useState, type CSSProperties } from "react";

import {
  BtnInteractAnim,
  CircularCloseButton as CircularCloseButtonConsts,
  Shared,
} from "./ComponentConstants";
import { circularCloseButtonFontSizePx } from "./pure/CircularCloseButtonLayout";
import { TextWeight } from "./Utils";

export type CircularCloseButtonProps = {
  ariaLabel: string;
  onClick: () => void;
  /** Outer width/height in CSS px. Defaults to {@link CircularCloseButtonConsts.SIZE_PX}. */
  sizePx?: number;
};

export function CircularCloseButton({
  ariaLabel,
  onClick,
  sizePx = CircularCloseButtonConsts.SIZE_PX,
}: CircularCloseButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = isHovered || isPressed;
  const interactTransition = `${BtnInteractAnim.BTN_INTERACT_DURA_MS}ms ease`;

  const buttonStyle: CSSProperties = {
    width: sizePx,
    height: sizePx,
    borderRadius: "50%",
    border: "none",
    backgroundColor: isHighlighted
      ? CircularCloseButtonConsts.INTERACT_FILL
      : CircularCloseButtonConsts.FILL,
    color: CircularCloseButtonConsts.TEXT_COLOR,
    fontSize: circularCloseButtonFontSizePx(sizePx),
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: CircularCloseButtonConsts.BOX_SHADOW,
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
      aria-label={ariaLabel}
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
