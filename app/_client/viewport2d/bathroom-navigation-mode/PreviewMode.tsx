"use client";

import { useCallback, type RefObject } from "react";

import { Globe as GlobeConsts } from "../../ComponentConstants";
import { useClientGeoRef } from "../../globe/ClientGeoContext";
import { useGlobeMovementSmoothRef } from "../../user-settings/useGlobeMovementSmooth";
import { type GlobeViewportHandle } from "../../globe/GlobeViewport";
import { readClientStartPos } from "../../pure/globe/ClientGeoStartPos";
import { restoreGlobeCameraState } from "../../pure/globe/GlobeCameraState";
import { navigateGlobeToLatLon } from "../../pure/globe/GlobeMovementNavigation";
import { findNearestBathroomModeShouldRender } from "../../pure/viewport2d/FindNearestBathroomState";
import { VIEWPORT2D_TOP_LAYER_Z_INDEX } from "../../pure/viewport2d/PositionalAlertAnchor";
import { ActionButtons } from "../add-bathroom-mode/ActionButtons";
import { useBathroomNavigationMode } from "./Context";

export type BathroomNavigationPreviewModeProps = {
  globeRef: RefObject<GlobeViewportHandle | null>;
};

export function BathroomNavigationPreviewMode({
  globeRef,
}: BathroomNavigationPreviewModeProps) {
  const clientGeoRef = useClientGeoRef();
  const globeMovementSmoothRef = useGlobeMovementSmoothRef();
  const {
    isPreviewActive,
    savedCameraState,
    exitPreview,
    acceptPreviewNavigation,
  } = useBathroomNavigationMode();

  const handleReject = useCallback(() => {
    if (savedCameraState) {
      restoreGlobeCameraState(
        globeRef.current,
        savedCameraState,
        globeMovementSmoothRef.current,
        GlobeConsts.ANIMATE_ON_INIT_DURA,
      );
    }
    exitPreview();
  }, [exitPreview, globeMovementSmoothRef, globeRef, savedCameraState]);

  const handleAccept = useCallback(() => {
    acceptPreviewNavigation();
    const startPos = readClientStartPos(globeRef.current, clientGeoRef.current);
    navigateGlobeToLatLon(
      {
        globe: globeRef.current,
        globeMovementSmooth: globeMovementSmoothRef.current,
        animationDurationMs: GlobeConsts.ANIMATE_ON_INIT_DURA,
      },
      startPos.latitude,
      startPos.longitude,
    );
  }, [
    acceptPreviewNavigation,
    clientGeoRef,
    globeMovementSmoothRef,
    globeRef,
  ]);

  if (!findNearestBathroomModeShouldRender(isPreviewActive)) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: VIEWPORT2D_TOP_LAYER_Z_INDEX,
        pointerEvents: "none",
      }}
    >
      <ActionButtons onCancel={handleReject} onConfirm={handleAccept} />
    </div>
  );
}
