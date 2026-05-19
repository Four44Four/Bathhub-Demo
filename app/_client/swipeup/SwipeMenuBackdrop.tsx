"use client";

import type { CSSProperties } from "react";

import { SwipeMenu as SwipeMenuConsts } from "../ComponentConstants";
import { useSwipeMenuBackdropOpacity } from "./SwipeMenuInteraction";

export function SwipeMenuBackdrop() {
  const backdropOpacity = useSwipeMenuBackdropOpacity();

  const style: CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    backgroundColor: SwipeMenuConsts.BACKDROP_COLOR,
    opacity: backdropOpacity,
    pointerEvents: "none",
    touchAction: "none",
  };

  return <div aria-hidden="true" style={style} />;
}
