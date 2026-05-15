"use client";

import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

import { Button as ButtonConsts } from "../ComponentConstants";
import { TextWeight } from "../Utils";

export type ButtonProps = {
  cornerRadius?: number;
  fillColor?: string;
  outlineColor?: string;
  outlineThickness?: number;
  textColor?: string;
  text?: string;
  textWeight?: TextWeight;
  x: number;
  y: number;
  zIndex?: number;
  imageSrc?: string;
  /** When both text and `imageSrc` are set, places the image on the left (`true`) or right (`false`) of the text. Defaults to left. */
  imageLeftOfText?: boolean;
  /** Space between image and text when both are present. Defaults to 0. */
  imageTextOffset?: number;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function Button({
  cornerRadius = ButtonConsts.CORNER_RADIUS,
  fillColor = ButtonConsts.DEFAULT_FILL_COLOR,
  outlineColor = ButtonConsts.DEFAULT_LINE_COLOR,
  outlineThickness = ButtonConsts.LINE_THICKNESS,
  textColor = ButtonConsts.TEXT_COLOR,
  textWeight = TextWeight.REGULAR,
  text,
  x,
  y,
  zIndex = 0,
  imageSrc,
  imageLeftOfText = true,
  imageTextOffset = 0,
  onClick,
}: ButtonProps) {
  const hasText = text != null && text.length > 0;
  const hasImage = imageSrc != null && imageSrc.length > 0;

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: hasText && hasImage ? imageTextOffset : 0,
    flexDirection: "row",
  };

  const imageEl = hasImage ? (
    <img
      src={imageSrc}
      alt=""
      draggable={false}
      style={{ height: 24, width: "auto", display: "block", flexShrink: 0 }}
    />
  ) : null;

  const textEl = hasText ? (
    <span
      className={textWeight}
      style={{
        color: textColor,
        fontSize: 14,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  ) : null;

  let inner: ReactNode;
  if (hasImage && hasText) {
    inner = (
      <div style={rowStyle}>
        {imageLeftOfText ? (
          <>
            {imageEl}
            {textEl}
          </>
        ) : (
          <>
            {textEl}
            {imageEl}
          </>
        )}
      </div>
    );
  } else if (hasImage) {
    inner = <div style={rowStyle}>{imageEl}</div>;
  } else if (hasText) {
    inner = <div style={rowStyle}>{textEl}</div>;
  } else {
    inner = null;
  }

  return (
    <button
      type="button"
      className="pointer-events-auto"
      onClick={onClick}
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex,
        margin: 0,
        padding: "10px 16px",
        borderRadius: cornerRadius,
        backgroundColor: fillColor,
        border: `${outlineThickness}px solid ${outlineColor}`,
        cursor: "pointer",
        boxSizing: "border-box",
      }}
    >
      {inner}
    </button>
  );
}
