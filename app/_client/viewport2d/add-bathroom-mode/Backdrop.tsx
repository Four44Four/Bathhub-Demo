"use client";

import type { CSSProperties } from "react";

import { Menus as MenuConsts, AddBathroom as AddBathroomConsts } from "../../ComponentConstants";
import { SWIPE_MENU_BACKDROP_Z_INDEX } from "../../pure/viewport2d/PositionalAlertAnchor";
import { LoadingSpinner } from "../LoadingSpinner";

export type BackdropProps = {
  opacity: number;
  spinnerOpacity: number;
  blocksPointerEvents: boolean;
};

export function Backdrop({
  opacity,
  spinnerOpacity,
  blocksPointerEvents,
}: BackdropProps) {
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
    pointerEvents: blocksPointerEvents ? "auto" : "none",
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
          <LoadingSpinner
            accentColor={AddBathroomConsts.LOADING_SPINNER_ACCENT_COLOR}
            baseColor={AddBathroomConsts.LOADING_SPINNER_BASE_COLOR}
            radiusPx={AddBathroomConsts.LOADING_SPINNER_RADIUS_PX}
          />
        </div>
      ) : null}
    </div>
  );
}
