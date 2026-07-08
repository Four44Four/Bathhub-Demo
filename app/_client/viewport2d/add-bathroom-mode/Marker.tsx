"use client";

import type { CSSProperties } from "react";

import { AddBathroom as AddBathroomConsts } from "../../ComponentConstants";

export function Marker() {
  const wrapStyle: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -100%)",
    width: AddBathroomConsts.MARKER_SIZE_PX,
    height: AddBathroomConsts.MARKER_SIZE_PX,
    pointerEvents: "none",
  };

  const imageStyle: CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "contain",
    opacity: AddBathroomConsts.MARKER_OPACITY,
    filter:
      "drop-shadow(0 0 0.55px rgba(12, 13, 18, 0.92)) drop-shadow(0 0 1.15px rgba(12, 13, 18, 0.42))",
    userSelect: "none",
  };

  return (
    <div aria-hidden="true" style={wrapStyle}>
      <img
        alt=""
        draggable={false}
        height={AddBathroomConsts.MARKER_SIZE_PX}
        src={AddBathroomConsts.MARKER_IMAGE}
        style={imageStyle}
        width={AddBathroomConsts.MARKER_SIZE_PX}
      />
    </div>
  );
}
