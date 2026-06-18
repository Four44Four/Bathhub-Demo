"use client";

import { useState, type CSSProperties } from "react";

import {
  BtnInteractAnim,
  CircularCloseButton as CircularCloseButtonConsts,
} from "./ComponentConstants";
import { multiplyHexColorBrightness } from "./pure/viewport2d/ButtonInteractColor";
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
  const brightnessMult = isHighlighted
    ? BtnInteractAnim.BTN_COLOR_VALUE_FACTOR_MULT
    : 1;

  const buttonStyle: CSSProperties = {
    width: sizePx,
    height: sizePx,
    borderRadius: "50%",
    border: "none",
    backgroundColor: multiplyHexColorBrightness(
      CircularCloseButtonConsts.FILL,
      brightnessMult,
    ),
    color: multiplyHexColorBrightness(
      CircularCloseButtonConsts.TEXT_COLOR,
      brightnessMult,
    ),
    fontSize: circularCloseButtonFontSizePx(sizePx),
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: CircularCloseButtonConsts.BOX_SHADOW,
    zIndex: 1,
    transition: `background-color ${interactTransition}, color ${interactTransition}`,
    padding: 0,
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
      ×
    </button>
  );
}
