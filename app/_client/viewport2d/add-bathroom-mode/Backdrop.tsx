"use client";

import type { CSSProperties } from "react";

import { Menus as MenuConsts } from "../../ComponentConstants";
import { SWIPE_MENU_BACKDROP_Z_INDEX } from "../../pure/viewport2d/PositionalAlertAnchor";
import { LoadingSpinner } from "./LoadingSpinner";

export type BackdropProps = {
  opacity: number;
  spinnerOpacity: number;
};

export function Backdrop({ opacity, spinnerOpacity }: BackdropProps) {
  if (opacity <= 0 && spinnerOpacity <= 0) return null;

  const style: CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: SWIPE_MENU_BACKDROP_Z_INDEX + 2,
    backgroundColor: MenuConsts.BACKDROP_COLOR,
    opacity,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: opacity > 0 ? "auto" : "none",
    touchAction: "none",
  };

  const spinnerWrapStyle: CSSProperties = {
    opacity: spinnerOpacity,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div aria-hidden={spinnerOpacity <= 0} style={style}>
      {spinnerOpacity > 0 ? (
        <div style={spinnerWrapStyle}>
          <LoadingSpinner />
        </div>
      ) : null}
    </div>
  );
}
