"use client";

import { RefObject, useCallback, useLayoutEffect, useState } from "react";

import { Button as ButtonConsts, SwipeMenu as SwipeMenuConsts, Globe as GlobeConsts } from "../../ComponentConstants";
import { navigateGlobeToLatLon } from "../../pure/globe/GlobeMovementNavigation";
import { useGlobeMovementSmoothRef } from "../../user-settings/useGlobeMovementSmooth";
import { type GlobeViewportHandle, getStartPos } from "../../globe/GlobeViewport";
import { viewportCircularButtonOuterSidePx } from "../../Utils";
import { Button } from "../Button";

export const BTN_IMG_SRC = "/crosshairs_center.svg";
export const BTN_OFFSET_PX = 15;
export const BTN_IMG_SIZE_PX = 40;
/** Padding inside the circular control on every side (`Button` circular mode). Uses 0 so the circle matches the image plus border. */
export const BTN_CIRCULAR_PADDING_PX = 5;
/** Distance from the left edge of the phone frame (matches `TestPathfind` `BTN_X`). */
export const BTN_X = 16;

/** `top` coordinate so the button sits `offsetAboveMenuPx` above the swipe menu collapsed top edge. */
export function recenterButtonTopPx(
  viewportHeightPx: number,
  collapsedMenuHeightPx: number,
  offsetAboveMenuPx: number,
  buttonOuterHeightPx: number,
): number {
  const collapsedMenuTopFromTop = viewportHeightPx - collapsedMenuHeightPx;
  return collapsedMenuTopFromTop - offsetAboveMenuPx - buttonOuterHeightPx;
}

export function recenterButtonLeftPx(leftInsetPx: number): number {
  return Math.max(0, leftInsetPx);
}

export type RecenterProps = {
  globeRef: RefObject<GlobeViewportHandle | null>;
  viewportRef: RefObject<HTMLElement | null>;
  isClientGeoGranted: boolean;
  mapInitLat: number;
  mapInitLong: number;
  btnOffsetPx?: number;
  btnImgSizePx?: number;
};

export function Recenter({
  globeRef,
  viewportRef,
  isClientGeoGranted,
  mapInitLat,
  mapInitLong,
  btnOffsetPx = BTN_OFFSET_PX,
  btnImgSizePx = BTN_IMG_SIZE_PX,
}: RecenterProps) {
  const globeMovementSmoothRef = useGlobeMovementSmoothRef();
  const inactiveHeightPx = SwipeMenuConsts.INACTIVE_HEIGHT_PX;

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const measureViewport = useCallback(() => {
    const target = viewportRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    setViewportSize({
      width: rect.width,
      height: rect.height,
    });
  }, [viewportRef]);

  useLayoutEffect(() => {
    measureViewport();
    const target = viewportRef.current;
    if (!target || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureViewport());
    ro.observe(target);
    return () => ro.disconnect();
  }, [measureViewport, viewportRef]);

  const outlineThicknessPx = ButtonConsts.LINE_THICKNESS;
  const outerSide = viewportCircularButtonOuterSidePx(
    btnImgSizePx,
    BTN_CIRCULAR_PADDING_PX,
    outlineThicknessPx,
  );

  const x =
    viewportSize.width > 0 ? recenterButtonLeftPx(BTN_X) : 0;
  const y =
    viewportSize.height > 0
      ? recenterButtonTopPx(
          viewportSize.height,
          inactiveHeightPx,
          btnOffsetPx,
          outerSide,
        )
      : 0;

  const onRecenterClick = () => {
    const p = getStartPos(globeRef.current, isClientGeoGranted, mapInitLat, mapInitLong);
    navigateGlobeToLatLon(
      {
        globe: globeRef.current,
        globeMovementSmooth: globeMovementSmoothRef.current,
        animationDurationMs: GlobeConsts.ANIMATE_ON_INIT_DURA,
      },
      p.latitude,
      p.longitude,
    );
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[38]">
      {viewportSize.width > 0 && viewportSize.height > 0 ? (
        <Button
          x={x}
          y={y}
          circular
          circularPaddingPx={BTN_CIRCULAR_PADDING_PX}
          imageSrc={BTN_IMG_SRC}
          imageSizePx={btnImgSizePx}
          onClick={onRecenterClick}
        />
      ) : null}
    </div>
  );
}
