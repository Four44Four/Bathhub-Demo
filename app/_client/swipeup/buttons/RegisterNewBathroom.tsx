"use client";

import type { RefObject } from "react";
import { PrimaryButton } from "../PrimaryButton";
import type { GlobeViewportHandle } from "../../globe/GlobeViewport";
import { useAlertSystem } from "../../viewport2d/AlertSystem";
import * as ServerDebug from "../../../_server/Debug";

export const REGISTER_NEW_BR_BTN_STR = "Add bathroom";
export const REGISTER_NEW_BR_BTN_IMAGE_PATH = "/plus_symbol.svg";

export type RegisterNewBathroomProps = {
  globeRef: RefObject<GlobeViewportHandle | null>;
};

export function RegisterNewBathroom({ globeRef }: RegisterNewBathroomProps) {
  const { showPositionalAlert } = useAlertSystem();
  return (
    <PrimaryButton
      label={REGISTER_NEW_BR_BTN_STR}
      imagePath={REGISTER_NEW_BR_BTN_IMAGE_PATH}
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
