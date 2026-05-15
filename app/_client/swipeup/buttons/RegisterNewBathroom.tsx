"use client";

import type { RefObject } from "react";
import { PrimaryButton } from "../PrimaryButton";
import { useSwipeMenuViewport } from "../MainMenu";
import type { GlobeViewportHandle } from "../../globe/GlobeViewport";
import * as ServerDebug from "../../../_server/Debug";

export const REGISTER_NEW_BR_BTN_STR = "Register new bathroom";
export const REGISTER_NEW_BR_BTN_IMAGE_PATH = "/bathhub_logo_no_bg.svg";

export type RegisterNewBathroomProps = {
  globeRef: RefObject<GlobeViewportHandle | null>;
};

export function RegisterNewBathroom({ globeRef }: RegisterNewBathroomProps) {
  const { heightPx } = useSwipeMenuViewport();
  return (
    <PrimaryButton
      label={REGISTER_NEW_BR_BTN_STR}
      imagePath={REGISTER_NEW_BR_BTN_IMAGE_PATH}
      viewportHeightPx={heightPx}
      onClick={() => {
        const latLon = globeRef.current?.getClickedIndicatorLatLon();
        if (!latLon) {
          // TODO: replace with error popup handler
          alert("No point picked !!");
          return;
        }
        const debugStr = JSON.stringify(latLon);
        ServerDebug.log(debugStr);
        console.log(debugStr);
      }}
    />
  );
}
