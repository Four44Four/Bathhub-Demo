"use client";

import type { CSSProperties } from "react";

import {
  NearestBathroom as NearestBathroomConsts,
  Shared as SharedConsts,
  SwipeMenu as SwipeMenuConsts,
} from "../../ComponentConstants";
import { useRecoloredSvgSrc } from "../add-bathroom-mode/useRecoloredSvgSrc";
import { useBathroomNavigationMode } from "../bathroom-navigation-mode";
import { VIEWPORT2D_TOP_LAYER_Z_INDEX } from "../../pure/viewport2d/PositionalAlertAnchor";
import { viewportCircularButtonOuterSidePx } from "../../Utils";
import {
  BTN_CIRCULAR_PADDING_PX,
  BTN_IMG_SIZE_PX,
  BTN_OFFSET_PX,
  BTN_X,
  findNearestBathroomButtonBottomPx,
} from "./FindNearestBathroom";

function exitFindBathroomIconStyle(): CSSProperties {
  return {
    height: BTN_IMG_SIZE_PX,
    width: BTN_IMG_SIZE_PX,
    display: "block",
    userSelect: "none",
  };
}

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
  const fillColor = SharedConsts.NEGATIVE_COLOR;
  const iconSrc = useRecoloredSvgSrc(
    NearestBathroomConsts.EXIT_FIND_BATHROOM_ICON_PATH,
    SharedConsts.ICON_ON_TINTED_BUTTON_COLOR,
  );
  const outerSidePx = viewportCircularButtonOuterSidePx(
    btnImgSizePx,
    BTN_CIRCULAR_PADDING_PX,
    0,
  );

  const onExitClick = () => {
    clearActiveNavigation();
  };

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
      <button
        type="button"
        aria-label="Exit find bathroom"
        onClick={onExitClick}
        style={{
          width: outerSidePx,
          height: outerSidePx,
          margin: 0,
          padding: BTN_CIRCULAR_PADDING_PX,
          border: "none",
          borderRadius: "50%",
          backgroundColor: fillColor,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          pointerEvents: "auto",
        }}
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt=""
            draggable={false}
            style={exitFindBathroomIconStyle()}
          />
        ) : null}
      </button>
    </div>
  );
}
