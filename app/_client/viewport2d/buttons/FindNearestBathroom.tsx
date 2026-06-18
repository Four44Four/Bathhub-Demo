"use client";

import { Button as ButtonConsts, SwipeMenu as SwipeMenuConsts } from "../../ComponentConstants";
import { VIEWPORT2D_TOP_LAYER_Z_INDEX } from "../../pure/viewport2d/PositionalAlertAnchor";
import { viewportCircularButtonOuterSidePx } from "../../Utils";
import { Button } from "../Button";
import { useBathroomNavigationMode } from "../bathroom-navigation-mode";

export const BTN_IMG_SRC = "/find_bathroom_icon.svg";
export const BTN_OFFSET_PX = 15;
export const BTN_IMG_SIZE_PX = 35;
/** Padding inside the circular control on every side (`Button` circular mode). */
export const BTN_CIRCULAR_PADDING_PX = 10;
/** Distance from the right edge of the phone frame (matches `Recenter` `BTN_X`). */
export const BTN_X = 16;

export function findNearestBathroomButtonRightPx(
  viewportWidthPx: number,
  rightInsetPx: number,
  buttonOuterWidthPx: number,
): number {
  return Math.max(0, viewportWidthPx - rightInsetPx - buttonOuterWidthPx);
}

export function findNearestBathroomButtonBottomPx(
  collapsedMenuHeightPx: number,
  offsetAboveMenuPx: number,
): number {
  return collapsedMenuHeightPx + offsetAboveMenuPx;
}

export type FindNearestBathroomProps = {
  btnOffsetPx?: number;
  btnImgSizePx?: number;
  rightInsetPx?: number;
  collapsedMenuHeightPx?: number;
  onClick?: () => void;
};

export function FindNearestBathroom({
  btnOffsetPx = BTN_OFFSET_PX,
  btnImgSizePx = BTN_IMG_SIZE_PX,
  rightInsetPx = BTN_X,
  collapsedMenuHeightPx = SwipeMenuConsts.INACTIVE_HEIGHT_PX,
  onClick,
}: FindNearestBathroomProps) {
  const { beginFindNearestBathroom } = useBathroomNavigationMode();
  const bottomPx = findNearestBathroomButtonBottomPx(
    collapsedMenuHeightPx,
    btnOffsetPx,
  );
  const outlineThicknessPx = ButtonConsts.LINE_THICKNESS;
  const outerSidePx = viewportCircularButtonOuterSidePx(
    btnImgSizePx,
    BTN_CIRCULAR_PADDING_PX,
    outlineThicknessPx,
  );

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        right: rightInsetPx,
        bottom: bottomPx,
        width: outerSidePx,
        height: outerSidePx,
        zIndex: VIEWPORT2D_TOP_LAYER_Z_INDEX,
      }}
    >
      <Button
        x={0}
        y={0}
        circular
        circularPaddingPx={BTN_CIRCULAR_PADDING_PX}
        imageSrc={BTN_IMG_SRC}
        imageSizePx={btnImgSizePx}
        onClick={onClick ?? beginFindNearestBathroom}
      />
    </div>
  );
}
