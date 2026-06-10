"use client";

import type { CSSProperties } from "react";

import { Menus as MenuConsts } from "../ComponentConstants";
import { SWIPE_MENU_BACKDROP_Z_INDEX } from "../pure/viewport2d/PositionalAlertAnchor";
import { useSwipeMenuBackdropOpacity } from "./SwipeMenuInteraction";

export function SwipeMenuBackdrop() {
  const backdropOpacity = useSwipeMenuBackdropOpacity();

  const style: CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: SWIPE_MENU_BACKDROP_Z_INDEX,
    backgroundColor: MenuConsts.BACKDROP_COLOR,
    opacity: backdropOpacity,
    pointerEvents: "none",
    touchAction: "none",
  };

  return <div aria-hidden="true" style={style} />;
}
