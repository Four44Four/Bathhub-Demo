"use client";

import { RefObject, useCallback, useLayoutEffect, useState } from "react";

import { Button as ButtonConsts, SwipeMenu as SwipeMenuConsts, Globe as GlobeConsts } from "../../ComponentConstants";
import { type GlobeViewportHandle, getStartPos } from "../../globe/GlobeViewport";
import { Button } from "../Button";

export const BTN_IMG_SRC = "/crosshairs_center.svg";
export const BTN_OFFSET_PX = 15;
export const BTN_IMG_SIZE_PX = 40;
/** Padding inside the circular control on every side (`Button` circular mode). Uses 0 so the circle matches the image plus border. */
export const BTN_CIRCULAR_PADDING_PX = 5;
/** Distance from the left edge of the phone frame (matches `TestPathfind` `BTN_X`). */
export const BTN_X = 16;

/** Outer width/height of a circular `Button` (`border-box`, symmetric padding). */
export function viewportCircularButtonOuterSidePx(
  imageSizePx: number,
  circularPaddingPx: number,
  outlineThicknessPx: number,
): number {
  return imageSizePx + 2 * circularPaddingPx + 2 * outlineThicknessPx;
}

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

function onRecenterClick(
  globeRef: RefObject<GlobeViewportHandle | null>,
  isClientGeoGranted: boolean,
  mapInitLat: number,
  mapInitLong: number,
) {
  const p = getStartPos(globeRef.current, isClientGeoGranted, mapInitLat, mapInitLong);
  if (GlobeConsts.ANIMATE_ON_INIT) {
    globeRef.current?.beginGeoArrivalInteractionLock();
    globeRef.current?.animateTo(p.latitude, p.longitude, GlobeConsts.ANIMATE_ON_INIT_DURA);
    globeRef.current?.animateZoomToInitTarget(GlobeConsts.ANIMATE_ON_INIT_DURA);
  }
  else {
    globeRef.current?.snapTo(p.latitude, p.longitude);
    globeRef.current?.snapZoomToInitTarget();
  }
}

export function Recenter({
  globeRef,
  viewportRef,
  isClientGeoGranted,
  mapInitLat,
  mapInitLong,
  btnOffsetPx = BTN_OFFSET_PX,
  btnImgSizePx = BTN_IMG_SIZE_PX,
}: RecenterProps) {
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

  return (
    <div className="pointer-events-none absolute inset-0 z-[39]">
      {viewportSize.width > 0 && viewportSize.height > 0 ? (
        <Button
          x={x}
          y={y}
          circular
          circularPaddingPx={BTN_CIRCULAR_PADDING_PX}
          imageSrc={BTN_IMG_SRC}
          imageSizePx={btnImgSizePx}
          onClick={() =>
            onRecenterClick(globeRef, isClientGeoGranted, mapInitLat, mapInitLong)
          }
        />
      ) : null}
    </div>
  );
}
