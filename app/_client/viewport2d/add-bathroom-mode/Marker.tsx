"use client";

import type { CSSProperties } from "react";

import {
  ADD_BATHROOM_MARKER_IMAGE,
  ADD_BATHROOM_MARKER_OPACITY,
  ADD_BATHROOM_MARKER_SIZE_PX,
} from "./Constants";

export function Marker() {
  const wrapStyle: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -100%)",
    width: ADD_BATHROOM_MARKER_SIZE_PX,
    height: ADD_BATHROOM_MARKER_SIZE_PX,
    pointerEvents: "none",
  };

  const imageStyle: CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "contain",
    opacity: ADD_BATHROOM_MARKER_OPACITY,
    filter:
      "drop-shadow(0 0 0.55px rgba(12, 13, 18, 0.92)) drop-shadow(0 0 1.15px rgba(12, 13, 18, 0.42))",
    userSelect: "none",
  };

  return (
    <div aria-hidden="true" style={wrapStyle}>
      <img
        alt=""
        draggable={false}
        height={ADD_BATHROOM_MARKER_SIZE_PX}
        src={ADD_BATHROOM_MARKER_IMAGE}
        style={imageStyle}
        width={ADD_BATHROOM_MARKER_SIZE_PX}
      />
    </div>
  );
}
