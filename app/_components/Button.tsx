"use client";

import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

export const BUTTON_CORNER_RADIUS = 8;
export const BUTTON_FILL_COLOR = "#0E0F11";
export const BUTTON_LINE_COLOR = "#20232D";
export const BUTTON_LINE_THICKNESS = 1;
export const BUTTON_TEXT_COLOR = "#AFB4C6";

export type ButtonProps = {
  cornerRadius?: number;
  fillColor?: string;
  outlineColor?: string;
  outlineThickness?: number;
  textColor?: string;
  text?: string;
  x: number;
  y: number;
  zIndex: number;
  imageSrc?: string;
  /** When both text and `imageSrc` are set, places the image on the left (`true`) or right (`false`) of the text. Defaults to left. */
  imageLeftOfText?: boolean;
  /** Space between image and text when both are present. Defaults to 0. */
  imageTextOffset?: number;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function Button({
  cornerRadius = BUTTON_CORNER_RADIUS,
  fillColor = BUTTON_FILL_COLOR,
  outlineColor = BUTTON_LINE_COLOR,
  outlineThickness = BUTTON_LINE_THICKNESS,
  textColor = BUTTON_TEXT_COLOR,
  text,
  x,
  y,
  zIndex,
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
