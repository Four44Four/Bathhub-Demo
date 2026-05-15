"use client";

import { PrimaryButton } from "../PrimaryButton";
import { useSwipeMenuViewport } from "../MainMenu";
import * as ServerDebug from "../../../_server/Debug";

export const NEAREST_BR_BTN_STR = "Find nearest bathroom";
export const NEAREST_BR_BTN_IMAGE_PATH = "/bathhub_logo_no_bg.svg";

export function FindNearestBathroom() {
  const { heightPx } = useSwipeMenuViewport();
  return (
    <PrimaryButton
      label={NEAREST_BR_BTN_STR}
      imagePath={NEAREST_BR_BTN_IMAGE_PATH}
      viewportHeightPx={heightPx}
      onClick={() => {
        const debugStr = "change this later";
        ServerDebug.log(debugStr);
        console.log(debugStr);
      }}
    />
  );
}
