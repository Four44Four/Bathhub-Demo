"use client";

import type { RefObject } from "react";
import { PrimaryButton } from "../PrimaryButton";
import { useSwipeMenuViewport } from "../MainMenu";
import type { GlobeViewportHandle } from "../../globe/GlobeViewport";
import { useAlertSystem } from "../../viewport2d/AlertSystem";
import * as ServerDebug from "../../../_server/Debug";

export const REGISTER_NEW_BR_BTN_STR = "Register new bathroom";
export const REGISTER_NEW_BR_BTN_IMAGE_PATH = "/bathhub_logo_no_bg.svg";

export type RegisterNewBathroomProps = {
  globeRef: RefObject<GlobeViewportHandle | null>;
};

export function RegisterNewBathroom({ globeRef }: RegisterNewBathroomProps) {
  const { heightPx } = useSwipeMenuViewport();
  const { showPositionalAlert } = useAlertSystem();
  return (
    <PrimaryButton
      label={REGISTER_NEW_BR_BTN_STR}
      imagePath={REGISTER_NEW_BR_BTN_IMAGE_PATH}
      viewportHeightPx={heightPx}
      onClick={(event) => {
        const latLon = globeRef.current?.getClickedIndicatorLatLon();
        if (!latLon) {
          showPositionalAlert({
            anchorElement: event.currentTarget,
            message: "No point picked !!",
            side: "up",
          });
          return;
        }
        const debugStr = JSON.stringify(latLon);
        ServerDebug.log(debugStr);
        console.log(debugStr);
      }}
    />
  );
}
