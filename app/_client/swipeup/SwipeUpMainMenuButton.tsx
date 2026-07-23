"use client";

import { useState, type CSSProperties, type MouseEventHandler } from "react";

import { TextWeight } from "../Utils";
import {
  SwipeUpMainMenuButton as SwipeUpMainMenuButtonConsts,
} from "../ComponentConstants";
import type { ImageDescriptor } from "../pure/Image";
import { resolveImageMonoColor } from "../pure/Image";
import { multiplyHexColorBrightness } from "../pure/viewport2d/ButtonInteractColor";
import { blackMonoIconCssFilterWithBrightness } from "../pure/svg/BlackMonoIconCssFilter";
import {
  resolveSwipeUpMainMenuButtonMinHeightPx,
  resolveSwipeUpMainMenuButtonWidthPx,
  swipeUpMainMenuButtonImageSizePx,
  swipeUpMainMenuButtonMaxContentHeightPx,
} from "../pure/swipeup/MainMenuLayout";
import { useSwipeMenuViewport } from "./SwipeMenuShell";

export type SwipeUpMainMenuButtonProps = {
  x: number;
  y: number;
  width: string;
  minHeight?: string;
  rowHeightPx?: number;
  text: string | null;
  image: ImageDescriptor | null;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function SwipeUpMainMenuButton({
  x,
  y,
  width,
  minHeight = SwipeUpMainMenuButtonConsts.DEFAULT_MIN_HEIGHT,
  rowHeightPx = 0,
  text,
  image,
  onClick,
}: SwipeUpMainMenuButtonProps) {
  const { widthPx } = useSwipeMenuViewport();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const buttonWidthPx = resolveSwipeUpMainMenuButtonWidthPx(width, widthPx);
  const imageSizePx = swipeUpMainMenuButtonImageSizePx(buttonWidthPx);
  const contentHeightPx = swipeUpMainMenuButtonMaxContentHeightPx(
    buttonWidthPx,
    text,
  );
  const resolvedMinHeightPx = resolveSwipeUpMainMenuButtonMinHeightPx(
    minHeight,
    rowHeightPx,
  );
  const buttonHeightPx = Math.max(resolvedMinHeightPx, contentHeightPx);
  const isHighlighted = isHovered || isPressed;
  const interactTransitionMs = SwipeUpMainMenuButtonConsts.ANIMATION_DURATION_MS;
  const interactTransition = `${interactTransitionMs}ms linear`;
  const brightnessMult = isHighlighted
    ? SwipeUpMainMenuButtonConsts.HOVER_INTERACT_DARKENING_MULT_FACTOR
    : 1;
  const fillColor = multiplyHexColorBrightness(
    SwipeUpMainMenuButtonConsts.FILL_COLOR,
    brightnessMult,
  );
  const textColor = multiplyHexColorBrightness(
    SwipeUpMainMenuButtonConsts.TEXT_COLOR,
    brightnessMult,
  );
  const imageMonoColor = resolveImageMonoColor(image);

  const buttonStyle: CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    width: buttonWidthPx,
    minHeight: resolvedMinHeightPx,
    height: buttonHeightPx,
    margin: 0,
    padding: `${SwipeUpMainMenuButtonConsts.PADDING_VERTICAL_PX}px ${SwipeUpMainMenuButtonConsts.PADDING_HORIZONTAL_PX}px`,
    boxSizing: "border-box",
    border: "none",
    borderRadius: SwipeUpMainMenuButtonConsts.CORNER_RADIUS_PX,
    backgroundColor: fillColor,
    transition: `background-color ${interactTransition}`,
    boxShadow: SwipeUpMainMenuButtonConsts.BOX_SHADOW,
    cursor: onClick ? "pointer" : "default",
    overflow: "hidden",
    whiteSpace: "normal",
  };

  const textAreaStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minWidth: 0,
    minHeight: 0,
    alignSelf: "stretch",
  };

  const textImageMarginStyle: CSSProperties = {
    flexShrink: 0,
    height:
      text != null && image != null
        ? SwipeUpMainMenuButtonConsts.TEXT_MARGIN_PX
        : 0,
    width: "100%",
  };

  const labelStyle: CSSProperties = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    color: textColor,
    fontSize: SwipeUpMainMenuButtonConsts.TEXT_FONT_SIZE,
    lineHeight: 1.2,
    textAlign: "center",
    whiteSpace: "normal",
    overflowWrap: "break-word",
    transition: `color ${interactTransition}`,
  };

  const imageStyle: CSSProperties = {
    width: imageSizePx,
    height: imageSizePx,
    objectFit: "contain",
    display: "block",
    flexShrink: 0,
    filter:
      image != null && imageMonoColor != null
        ? blackMonoIconCssFilterWithBrightness(imageMonoColor, brightnessMult)
        : undefined,
    transition: `filter ${interactTransition}`,
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
      {text != null ? (
        <div style={textAreaStyle}>
          <span className={TextWeight.BOLD} style={labelStyle}>
            {text}
          </span>
        </div>
      ) : image != null ? (
        <div aria-hidden="true" style={textAreaStyle} />
      ) : null}
      {image != null ? (
        <>
          <div aria-hidden="true" style={textImageMarginStyle} />
          <img
            src={image.path}
            alt=""
            draggable={false}
            style={imageStyle}
          />
        </>
      ) : null}
    </button>
  );
}
