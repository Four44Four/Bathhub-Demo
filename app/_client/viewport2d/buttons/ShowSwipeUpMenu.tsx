"use client";

import { Viewport2dButton as Viewport2dButtonConsts } from "../../ComponentConstants";
import { createMonoColorImage } from "../../pure/Image";
import { viewportRectangularButtonOuterSidePx } from "../../pure/viewport2d/ButtonLayout";
import { VIEWPORT2D_TOP_LAYER_Z_INDEX } from "../../pure/viewport2d/PositionalAlertAnchor";
import { useExpandSwipeMenu } from "../../swipeup/SwipeMenuExpansion";
import { Button } from "../Button";

export const BTN_IMG_SRC = "/hamburger_icon.svg";
export const BTN_IMAGE = createMonoColorImage(
  BTN_IMG_SRC,
  Viewport2dButtonConsts.ICON_COLOR,
);
/** Distance from the top edge of the phone frame. */
export const BTN_Y = 16;
/** Distance from the left edge of the phone frame (matches `Recenter` `BTN_X`). */
export const BTN_X = 16;
export const BTN_IMG_SIZE_PX = Viewport2dButtonConsts.IMAGE_SIZE;
export const BTN_PADDING_PX = 8;

export function showSwipeUpMenuButtonTopPx(topInsetPx: number): number {
  return Math.max(0, topInsetPx);
}

export function showSwipeUpMenuButtonLeftPx(leftInsetPx: number): number {
  return Math.max(0, leftInsetPx);
}

export function showSwipeUpMenuButtonOuterSidePx(
  btnImgSizePx: number = BTN_IMG_SIZE_PX,
  paddingPx: number = BTN_PADDING_PX,
  outlineThicknessPx: number = Viewport2dButtonConsts.OUTLINE_THICKNESS,
): number {
  return viewportRectangularButtonOuterSidePx(
    btnImgSizePx,
    paddingPx,
    outlineThicknessPx,
  );
}

export type ShowSwipeUpMenuProps = {
  topInsetPx?: number;
  leftInsetPx?: number;
  btnImgSizePx?: number;
  paddingPx?: number;
  onClick?: () => void;
};

export function ShowSwipeUpMenu({
  topInsetPx = BTN_Y,
  leftInsetPx = BTN_X,
  btnImgSizePx = BTN_IMG_SIZE_PX,
  paddingPx = BTN_PADDING_PX,
  onClick,
}: ShowSwipeUpMenuProps) {
  const expandSwipeMenu = useExpandSwipeMenu();
  const outerSidePx = showSwipeUpMenuButtonOuterSidePx(
    btnImgSizePx,
    paddingPx,
  );

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        top: showSwipeUpMenuButtonTopPx(topInsetPx),
        left: showSwipeUpMenuButtonLeftPx(leftInsetPx),
        width: outerSidePx,
        height: outerSidePx,
        zIndex: VIEWPORT2D_TOP_LAYER_Z_INDEX,
      }}
    >
      <Button
        x={0}
        y={0}
        padding={paddingPx}
        image={BTN_IMAGE}
        imageSize={btnImgSizePx}
        onClick={onClick ?? expandSwipeMenu}
      />
    </div>
  );
}
