"use client";

import { CircularCloseButton } from "../../CircularCloseButton";
import {
  CircularCloseButton as CircularCloseButtonConsts,
  SwipeMenu as SwipeMenuConsts,
} from "../../ComponentConstants";
import { bottomRightAnchorInsetsForSharedCenter } from "../../pure/viewport2d/BottomRightAnchorCenterAlignment";
import { VIEWPORT2D_TOP_LAYER_Z_INDEX } from "../../pure/viewport2d/PositionalAlertAnchor";
import { useBathroomNavigationMode } from "../bathroom-navigation-mode";
import {
  BTN_OFFSET_PX,
  BTN_X,
  findNearestBathroomButtonBottomPx,
  findNearestBathroomButtonOuterSidePx,
} from "./FindNearestBathroom";

export type ExitFindBathroomProps = {
  btnOffsetPx?: number;
  rightInsetPx?: number;
  collapsedMenuHeightPx?: number;
};

export function ExitFindBathroom({
  btnOffsetPx = BTN_OFFSET_PX,
  rightInsetPx = BTN_X,
  collapsedMenuHeightPx = SwipeMenuConsts.INACTIVE_HEIGHT_PX,
}: ExitFindBathroomProps) {
  const { clearActiveNavigation } = useBathroomNavigationMode();
  const findNearestBottomPx = findNearestBathroomButtonBottomPx(
    collapsedMenuHeightPx,
    btnOffsetPx,
  );
  const findNearestOuterSidePx = findNearestBathroomButtonOuterSidePx();
  const exitOuterSidePx = CircularCloseButtonConsts.SIZE_PX;
  const { rightPx, bottomPx } = bottomRightAnchorInsetsForSharedCenter(
    rightInsetPx,
    findNearestBottomPx,
    findNearestOuterSidePx,
    exitOuterSidePx,
  );

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        right: rightPx,
        bottom: bottomPx,
        width: exitOuterSidePx,
        height: exitOuterSidePx,
        zIndex: VIEWPORT2D_TOP_LAYER_Z_INDEX,
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <CircularCloseButton
          ariaLabel="Exit find bathroom"
          onClick={clearActiveNavigation}
        />
      </div>
    </div>
  );
}
