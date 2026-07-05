"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

import { runAbortableTimeout } from "../../pure/AbortableTimeout";
import { requestFindNearestBathroom } from "../../pure/viewport2d/FindNearestBathroomClientRequest";
import { USER_SETTINGS_DEFAULTS } from "@/app/_shared/user-settings/UserSettingsSchema";
import { useUserSettings } from "../../user-settings/UserSettingsContext";
import { useGlobeMovementSmoothRef } from "../../user-settings/useGlobeMovementSmooth";
import { useClientGeoRef } from "../../globe/ClientGeoContext";
import {
  type GlobeViewportHandle,
} from "../../globe/GlobeViewport";
import { readClientStartPos } from "../../pure/globe/ClientGeoStartPos";
import { Globe as GlobeConsts, NearestBathroom as NearestBathroomConsts } from "../../ComponentConstants";
import {
  findNearestBathroomFailureAlertMessage,
  findNearestBathroomRequestApplyTerminalFailure,
  findNearestBathroomRequestReset,
} from "../../pure/viewport2d/FindNearestBathroomState";
import { resolveFindNearestBathroomFlowOutcome } from "../../pure/viewport2d/RunFindNearestBathroomFlow";
import {
  captureGlobeCameraStateAtInteraction,
  navigateGlobeToBathroomPreview,
  type SavedGlobeCameraState,
} from "../../pure/globe/GlobeCameraState";
import { useReportRateLimitViolation } from "../../pure/rate-limit/useReportRateLimitViolation";
import { useAlertSystem } from "../AlertSystem";
import { useBathroomNavigationMode } from "./Context";

export type UseFindNearestBathroomFlowArgs = {
  globeRef: RefObject<GlobeViewportHandle | null>;
};

export function useFindNearestBathroomFlow({
  globeRef,
}: UseFindNearestBathroomFlowArgs) {
  const clientGeoRef = useClientGeoRef();
  const { settings } = useUserSettings();
  const globeMovementSmoothRef = useGlobeMovementSmoothRef();
  const { showImportantAlert } = useAlertSystem();
  const reportRateLimitViolation = useReportRateLimitViolation();
  const {
    requestState,
    beginFindNearestBathroom,
    enterPreview,
    setRequestState,
  } = useBathroomNavigationMode();
  const inFlightRef = useRef(false);
  const savedCameraAtInteractionRef = useRef<SavedGlobeCameraState | null>(null);

  const beginFindNearestBathroomWithSavedCamera = useCallback(() => {
    const { mapInitLat, mapInitLong } = clientGeoRef.current;
    savedCameraAtInteractionRef.current = captureGlobeCameraStateAtInteraction(
      globeRef.current,
      { latitude: mapInitLat, longitude: mapInitLong },
    );
    beginFindNearestBathroom();
  }, [beginFindNearestBathroom, clientGeoRef, globeRef]);

  const runFindNearest = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const startPos = readClientStartPos(globeRef.current, clientGeoRef.current);
    const savedCameraState = savedCameraAtInteractionRef.current;
    if (!savedCameraState) {
      inFlightRef.current = false;
      return;
    }
    const maxDistanceM =
      settings?.find_nearest_bathroom_max_dist_m ??
      USER_SETTINGS_DEFAULTS.find_nearest_bathroom_max_dist_m;

    const result = await runAbortableTimeout(
      (signal) =>
        requestFindNearestBathroom(
          { location: startPos, constraints: { maxDistanceM } },
          signal,
        ),
      NearestBathroomConsts.FIND_NEAREST_BATHROOM_REQUEST_TIMEOUT_MS,
    );

    const outcome = resolveFindNearestBathroomFlowOutcome(result);
    if (outcome.kind === "enter_preview") {
      enterPreview(
        {
          id: outcome.target.id,
          latitude: outcome.target.latitude,
          longitude: outcome.target.longitude,
        },
        savedCameraState,
        startPos,
      );
      navigateGlobeToBathroomPreview(
        globeRef.current,
        outcome.target.latitude,
        outcome.target.longitude,
        globeMovementSmoothRef.current,
        GlobeConsts.ANIMATE_ON_INIT_DURA,
      );
      inFlightRef.current = false;
      return;
    }

    if (outcome.kind === "noop") {
      inFlightRef.current = false;
      return;
    }

    setRequestState((state) =>
      findNearestBathroomRequestApplyTerminalFailure(state, outcome.phase),
    );

    const rateLimitErrorMsg =
      result !== "timeout" && result !== "error" ? result.errorMsg : undefined;
    const rateLimited = reportRateLimitViolation(rateLimitErrorMsg);
    if (rateLimited) {
      setRequestState(() => findNearestBathroomRequestReset());
      inFlightRef.current = false;
      return;
    }

    showImportantAlert({
      message: findNearestBathroomFailureAlertMessage(outcome.phase),
      positive: false,
      onDismiss: () => {
        setRequestState(() => findNearestBathroomRequestReset());
      },
    });
    inFlightRef.current = false;
  }, [
    clientGeoRef,
    enterPreview,
    globeMovementSmoothRef,
    globeRef,
    setRequestState,
    settings?.find_nearest_bathroom_max_dist_m,
    showImportantAlert,
    reportRateLimitViolation,
  ]);

  useEffect(() => {
    if (requestState.phase !== "pending") return;
    void runFindNearest();
  }, [requestState.phase, runFindNearest]);

  return { beginFindNearestBathroom: beginFindNearestBathroomWithSavedCamera };
}
