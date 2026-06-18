"use client";

import { NearestBathroom as NearestBathroomConsts } from "../../ComponentConstants";
import { TextWeight } from "../../Utils";

export type ReachedTargetBandProps = {
  visible: boolean;
};

export function ReachedTargetBand({ visible }: ReachedTargetBandProps) {
  if (!visible) return null;

  return (
    <div
      className={TextWeight.BOLD}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: NearestBathroomConsts.BATHROOM_REACHED_TARGET_BAND_Z_INDEX,
        backgroundColor: NearestBathroomConsts.BATHROOM_REACHED_TARGET_BAND_BG_COLOR,
        color: NearestBathroomConsts.BATHROOM_REACHED_TARGET_BAND_TEXT_COLOR,
        fontSize: NearestBathroomConsts.BATHROOM_REACHED_TARGET_BAND_FONT_SIZE_PX,
        lineHeight: NearestBathroomConsts.BATHROOM_REACHED_TARGET_BAND_LINE_HEIGHT,
        textAlign: "center",
        padding: NearestBathroomConsts.BATHROOM_REACHED_TARGET_BAND_PADDING,
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      {NearestBathroomConsts.BATHROOM_REACHED_TARGET_BAND_MESSAGE}
    </div>
  );
}
