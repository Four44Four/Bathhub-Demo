"use client";

import type { CSSProperties, MouseEventHandler } from "react";

import { TextWeight } from "../Utils";
import {
  SWIPE_MENU_PRIMARY_BTN_BG_COLOR,
  SWIPE_MENU_PRIMARY_BTN_FONT_SIZE,
  swipeMenuPrimaryButtonHeightPx,
  SWIPE_MENU_PRIMARY_BTN_FONT_COLOR,
} from "./MainMenu";

export type PrimaryButtonProps = {
  label: string;
  imagePath: string;
  viewportHeightPx: number;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function PrimaryButton({
  label,
  imagePath,
  viewportHeightPx,
  onClick,
}: PrimaryButtonProps) {
  const heightPx = swipeMenuPrimaryButtonHeightPx(viewportHeightPx);

  const buttonStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
    flex: "1 1 0",
    minWidth: 0,
    height: heightPx,
    margin: 0,
    padding: "8px 6px",
    boxSizing: "border-box",
    border: "none",
    borderRadius: 8,
    backgroundColor: SWIPE_MENU_PRIMARY_BTN_BG_COLOR,
    cursor: onClick ? "pointer" : "default",
    overflow: "hidden",
  };

  const labelStyle: CSSProperties = {
    flexShrink: 0,
    color: SWIPE_MENU_PRIMARY_BTN_FONT_COLOR,
    fontSize: SWIPE_MENU_PRIMARY_BTN_FONT_SIZE,
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
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    display: "block",
  };

  return (
    <button type="button" style={buttonStyle} onClick={onClick}>
      <span className={TextWeight.BOLD} style={labelStyle}>
        {label}
      </span>
      <div style={imageWrapStyle}>
        <img src={imagePath} alt="" draggable={false} style={imageStyle} />
      </div>
    </button>
  );
}
