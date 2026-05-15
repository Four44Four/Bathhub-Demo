"use client";

import { RefObject } from "react";

import { Button } from "../Button";
import * as ServerDebug from "../../../_server/Debug";
import * as ServerPathfind from "../../../_server/Pathfind";
import * as SharedUtils from "../../../_shared/Utils";
import { type GlobeViewportHandle } from "../../globe/GlobeViewport";

export const BTN_STR = "Test pathfind";
export const BTN_X = 16;
export const BTN_Y = 48;

export type TestPathfindProps = {
    globeRef: RefObject<GlobeViewportHandle | null>;
    isClientGeoGranted: boolean;
    mapInitLat: number;
    mapInitLong: number;
};

/** 
 * Current client location
 * OR
 * (if client disabled geolocation)
 * Surface point under the viewport center
 *    or last known map init if Cesium is not ready. 
 * */
function getStartPos(
    globe: GlobeViewportHandle | null,
    isClientGeoGranted: boolean,
    mapInitLat: number,
    mapInitLong: number,
): SharedUtils.Point {
    if (!isClientGeoGranted) {
      return (
        globe?.getViewportCenterLatLon() ?? {
          latitude: mapInitLat,
          longitude: mapInitLong,
        }
      );
    }
  
    // Coordinates from geolocation success callbacks (`applyInstantBootstrapPosition`,
    // `applyGeolocationPosition`); kept in sync with `mapInitLat` / `mapInitLong`.
    return {
      latitude: mapInitLat,
      longitude: mapInitLong,
    };
}
  
async function onTestPathfindClick(
    globeRef: RefObject<GlobeViewportHandle | null>,
    isClientGeoGranted: boolean,
    mapInitLat: number,
    mapInitLong: number,
) {
    const startPos = getStartPos(
      globeRef.current,
      isClientGeoGranted,
      mapInitLat,
      mapInitLong,
    );
    const endPos = globeRef.current?.getClickedIndicatorLatLon();
    if (endPos == null) {
      // TODO: replace with error popup handler
      alert("No point picked !!");
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
      // TODO: replace with error popup handler
      alert(pathDataErrorable.errorMsg);
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
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
        <Button
            text={BTN_STR}
            x={BTN_X}
            y={BTN_Y}
            onClick={() =>
              onTestPathfindClick(
                globeRef,
                isClientGeoGranted,
                mapInitLat,
                mapInitLong,
              )
            }
        />
    </div>
  );
}
