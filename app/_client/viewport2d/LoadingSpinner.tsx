"use client";

import { useId, type CSSProperties } from "react";

import { LoadingSpinner as LoadingSpinnerConsts } from "../ComponentConstants";
import {
  loadingSpinnerCenteredPositionPx,
  loadingSpinnerElementSizePx,
} from "../pure/viewport2d/LoadingSpinnerLayout";

export type LoadingSpinnerProps = {
  accentColor: string;
  baseColor: string;
  radiusPx: number;
  /**
   * When both are set, absolutely positions the ring center at `(x, y)` in CSS pixels
   * relative to the nearest positioned ancestor.
   */
  x?: number;
  y?: number;
};

export function LoadingSpinner({
  accentColor,
  baseColor,
  radiusPx,
  x,
  y,
}: LoadingSpinnerProps) {
  const sizePx = loadingSpinnerElementSizePx(radiusPx);
  const thicknessPx = LoadingSpinnerConsts.THICKNESS_PX;
  const cycleDurationSec = LoadingSpinnerConsts.CYCLE_DURATION_MS / 1000;
  const animationName = useId().replace(/:/g, "");

  const style: CSSProperties = {
    width: sizePx,
    height: sizePx,
    borderRadius: "50%",
    border: `${thicknessPx}px solid ${baseColor}`,
    borderTopColor: accentColor,
    animation: `${animationName} ${cycleDurationSec}s linear infinite`,
    boxSizing: "border-box",
    flexShrink: 0,
  };

  if (x != null && y != null) {
    const { left, top } = loadingSpinnerCenteredPositionPx(x, y, radiusPx);
    style.position = "absolute";
    style.left = left;
    style.top = top;
  }

  return (
    <>
      <style>{`
        @keyframes ${animationName} {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div aria-hidden="true" style={style} />
    </>
  );
}
