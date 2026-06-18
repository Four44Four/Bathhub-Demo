"use client";

import { NearestBathroom as NearestBathroomConsts } from "../../ComponentConstants";
import { TextWeight } from "../../Utils";

export type PathUpdateErrorBandProps = {
  message: string | null;
};

export function PathUpdateErrorBand({ message }: PathUpdateErrorBandProps) {
  if (!message) return null;

  return (
    <div
      className={TextWeight.BOLD}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: NearestBathroomConsts.BATHROOM_PATH_UPDATE_ERROR_BAND_Z_INDEX,
        backgroundColor:
          NearestBathroomConsts.BATHROOM_PATH_UPDATE_ERROR_BAND_BG_COLOR,
        color: NearestBathroomConsts.BATHROOM_PATH_UPDATE_ERROR_BAND_TEXT_COLOR,
        fontSize: NearestBathroomConsts.BATHROOM_PATH_UPDATE_ERROR_BAND_FONT_SIZE_PX,
        lineHeight: NearestBathroomConsts.BATHROOM_PATH_UPDATE_ERROR_BAND_LINE_HEIGHT,
        textAlign: "center",
        padding: NearestBathroomConsts.BATHROOM_PATH_UPDATE_ERROR_BAND_PADDING,
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}
