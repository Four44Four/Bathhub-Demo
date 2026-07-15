"use client";

import { useState, type CSSProperties, type MouseEventHandler } from "react";

import { TextWeight } from "../Utils";
import {
  swipeMenuPrimaryButtonHeightPx,
  swipeMenuPrimaryButtonItemWidthPx,
  useSwipeMenuViewport,
} from "./MainMenu";

import {
  BtnInteractAnim,
  SwipeMenu as SwipeMenuConsts,
} from "../ComponentConstants";
import { blackMonoIconCssFilter } from "../pure/svg/BlackMonoIconCssFilter";

export type PrimaryButtonProps = {
  label: string;
  imagePath: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function PrimaryButton({
  label,
  imagePath,
  onClick,
}: PrimaryButtonProps) {
  const { widthPx } = useSwipeMenuViewport();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const buttonWidthPx = swipeMenuPrimaryButtonItemWidthPx(widthPx);
  const buttonHeightPx = swipeMenuPrimaryButtonHeightPx();
  const imageWidthPx = buttonWidthPx * SwipeMenuConsts.PRIMARY_BTN_IMG_WIDTH_RATIO;
  const isHighlighted = isHovered || isPressed;
  const interactTransitionMs = BtnInteractAnim.BTN_INTERACT_DURA_MS;
  const interactTransition = `${interactTransitionMs}ms ease`;

  const interactFgBrightness = isHighlighted
    ? SwipeMenuConsts.BTN_INTERACT_FG_VALUE_FACTOR
    : 1;

  const buttonStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    flexShrink: 0,
    width: buttonWidthPx,
    height: buttonHeightPx,
    margin: 0,
    padding: "8px 6px",
    boxSizing: "border-box",
    border: "none",
    borderRadius: 15,
    backgroundColor: isHighlighted
      ? SwipeMenuConsts.BTN_INTERACT_BG_COLOR
      : SwipeMenuConsts.PRIMARY_BTN_BG_COLOR,
    transition: `background-color ${interactTransition}`,
    boxShadow: `0 2px 8px rgba(18, 18, 47, ${SwipeMenuConsts.PRIMARY_BTN_SHADOW_ALPHA})`,
    cursor: onClick ? "pointer" : "default",
    overflow: "hidden",
  };

  const contentStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
    flex: 1,
    minHeight: 0,
    width: "100%",
    filter: `brightness(${interactFgBrightness})`,
    transition: `filter ${interactTransition}`,
  };

  const labelStyle: CSSProperties = {
    flexShrink: 0,
    color: SwipeMenuConsts.PRIMARY_BTN_FONT_COLOR,
    fontSize: SwipeMenuConsts.PRIMARY_BTN_FONT_SIZE,
    lineHeight: 1.2,
    textAlign: "center",
  };

  const imageWrapStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const imageStyle: CSSProperties = {
    width: imageWidthPx,
    maxWidth: "100%",
    maxHeight: "100%",
    height: "auto",
    objectFit: "contain",
    display: "block",
    filter: blackMonoIconCssFilter(SwipeMenuConsts.PRIMARY_BTN_ICON_COLOR),
  };

  return (
    <button
      type="button"
      style={buttonStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
    >
      <div style={contentStyle}>
        <span className={TextWeight.BOLD} style={labelStyle}>
          {label}
        </span>
        <div style={imageWrapStyle}>
          <img src={imagePath} alt="" draggable={false} style={imageStyle} />
        </div>
      </div>
    </button>
  );
}
