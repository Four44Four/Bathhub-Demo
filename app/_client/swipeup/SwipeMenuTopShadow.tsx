"use client";

import type { CSSProperties } from "react";

import { Menus as MenuConsts, SwipeMenu as SwipeMenuConsts } from "../ComponentConstants";
import {
  swipeMenuShadowGradient,
  swipeMenuTopShadowTopPx,
} from "../pure/swipeup/SwipeMenu";
import { SWIPE_MENU_TOP_SHADOW_Z_INDEX } from "../pure/viewport2d/PositionalAlertAnchor";
import { useSwipeMenuHeightPx } from "./SwipeMenuInteraction";

export function SwipeMenuTopShadow() {
  const menuHeightPx = useSwipeMenuHeightPx();

  if (menuHeightPx <= 0) return null;

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: menuHeightPx,
    pointerEvents: "none",
    zIndex: SWIPE_MENU_TOP_SHADOW_Z_INDEX,
  };

  const shadowStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    top: swipeMenuTopShadowTopPx(
      SwipeMenuConsts.SHADOW_ALPHA_HEIGHT_PX,
      SwipeMenuConsts.TOP_CORNER_RADIUS_PX,
    ),
    height: SwipeMenuConsts.SHADOW_ALPHA_HEIGHT_PX,
    background: swipeMenuShadowGradient(
      MenuConsts.BACKDROP_COLOR,
      SwipeMenuConsts.SHADOW_ALPHA_FACTOR,
    ),
  };

  return (
    <div aria-hidden="true" style={wrapperStyle}>
      <div style={shadowStyle} />
    </div>
  );
}
