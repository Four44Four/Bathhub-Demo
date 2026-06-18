"use client";

import { CircularCloseButton } from "../../CircularCloseButton";
import { SwipeMenu as SwipeMenuConsts } from "../../ComponentConstants";
import { VIEWPORT2D_TOP_LAYER_Z_INDEX } from "../../pure/viewport2d/PositionalAlertAnchor";
import { useBathroomNavigationMode } from "../bathroom-navigation-mode";
import {
  BTN_IMG_SIZE_PX,
  BTN_OFFSET_PX,
  BTN_X,
  findNearestBathroomButtonBottomPx,
  findNearestBathroomButtonOuterSidePx,
} from "./FindNearestBathroom";

export type ExitFindBathroomProps = {
  btnOffsetPx?: number;
  btnImgSizePx?: number;
  rightInsetPx?: number;
  collapsedMenuHeightPx?: number;
};

export function ExitFindBathroom({
  btnOffsetPx = BTN_OFFSET_PX,
  btnImgSizePx = BTN_IMG_SIZE_PX,
  rightInsetPx = BTN_X,
  collapsedMenuHeightPx = SwipeMenuConsts.INACTIVE_HEIGHT_PX,
}: ExitFindBathroomProps) {
  const { clearActiveNavigation } = useBathroomNavigationMode();
  const bottomPx = findNearestBathroomButtonBottomPx(
    collapsedMenuHeightPx,
    btnOffsetPx,
  );
  const sizePx = findNearestBathroomButtonOuterSidePx(btnImgSizePx);

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        right: rightInsetPx,
        bottom: bottomPx,
        zIndex: VIEWPORT2D_TOP_LAYER_Z_INDEX,
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <CircularCloseButton
          ariaLabel="Exit find bathroom"
          onClick={clearActiveNavigation}
          sizePx={sizePx}
        />
      </div>
    </div>
  );
}
