"use client";

import { RefObject } from "react";

import { Button } from "../Button";
import { type AlertSystemApi, useAlertSystem } from "../AlertSystem";
import * as ServerDebug from "../../../_server/Debug";
import * as ServerPathfind from "../../../_server/Pathfind";
import * as SharedUtils from "../../../_shared/Utils";
import { type GlobeViewportHandle, getStartPos } from "../../globe/GlobeViewport";

export const BTN_STR = "Test pathfind";
export const BTN_X = 16;
export const BTN_Y = 48;

export type TestPathfindProps = {
    globeRef: RefObject<GlobeViewportHandle | null>;
    isClientGeoGranted: boolean;
    mapInitLat: number;
    mapInitLong: number;
};

async function onTestPathfindClick(
    globeRef: RefObject<GlobeViewportHandle | null>,
    isClientGeoGranted: boolean,
    mapInitLat: number,
    mapInitLong: number,
    anchorElement: HTMLElement,
    showImportantAlert: AlertSystemApi["showImportantAlert"],
    showPositionalAlert: AlertSystemApi["showPositionalAlert"],
) {
    const startPos = getStartPos(
      globeRef.current,
      isClientGeoGranted,
      mapInitLat,
      mapInitLong,
    );
    const endPos = globeRef.current?.getClickedIndicatorLatLon();
    if (endPos == null) {
      showPositionalAlert({
        anchorElement,
        message: "No point picked !!",
        side: "down",
      });
      return;
    }
  
    const pathDataErrorable: SharedUtils.Errorable<ServerPathfind.PathData> 
      = await ServerPathfind.getPathBetweenPoints({
          profile: "foot-walking",
          startLatitude: startPos.latitude,
          startLongitude: startPos.longitude,
          endLatitude: endPos.latitude,
          endLongitude: endPos.longitude,
        });
  
    if (pathDataErrorable.errorMsg) {
      showImportantAlert({ message: pathDataErrorable.errorMsg });
    } 
    else {
      const pathDataStr = JSON.stringify(pathDataErrorable.val);
      ServerDebug.log(pathDataStr);
      console.log(pathDataStr);
      const pts = pathDataErrorable.val?.points;
      if (pts && pts.length >= 2) {
        globeRef.current?.setPathFromLatLonPoints(pts);
      }
    }
}

export function TestPathfind({
  globeRef,
  isClientGeoGranted,
  mapInitLat,
  mapInitLong,
}: TestPathfindProps) {
  const { showImportantAlert, showPositionalAlert } = useAlertSystem();
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
        <Button
            text={BTN_STR}
            x={BTN_X}
            y={BTN_Y}
            onClick={(event) =>
              onTestPathfindClick(
                globeRef,
                isClientGeoGranted,
                mapInitLat,
                mapInitLong,
                event.currentTarget,
                showImportantAlert,
                showPositionalAlert,
              )
            }
        />
    </div>
  );
}
