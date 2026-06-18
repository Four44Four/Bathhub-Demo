"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import {
  hasReachedBathroomTarget,
  initialPathUpdateTracker,
  pathUpdateTrackerAfterPathRequest,
  pathUpdateTrackerAtRequestStart,
} from "@/app/_shared/find-nearest-bathroom/PathUpdatePolicy";
import { evaluatePathPollTick } from "../../pure/viewport2d/BathroomActiveNavigationPathPoll";
import {
  shouldPauseBathroomActiveNavigation,
} from "../../pure/viewport2d/BathroomActiveNavigationPausePolicy";
import { runAbortableTimeout } from "../../pure/AbortableTimeout";
import {
  pathUpdateErrorBandMessage,
  resolvePathUpdateRequestOutcome,
  shouldShowPathUpdateErrorBand,
} from "../../pure/viewport2d/ResolvePathUpdateRequest";
import * as ServerPathfind from "@/app/_server/Pathfind";
import { type LatLong } from "@/app/_shared/BathroomDataPrimary";
import {
  pathUpdateTrackerOriginLocation,
  persistLastPathPointsToStorage,
  type PersistedPathPoint,
} from "@/app/_shared/find-nearest-bathroom/BathroomActiveNavigationPersistence";
import { useClientGeo, useClientGeoRef } from "../../globe/ClientGeoContext";
import { type GlobeViewportHandle } from "../../globe/GlobeViewport";
import { readClientStartPos } from "../../pure/globe/ClientGeoStartPos";
import { useBathroomNavigationMode } from "./Context";
import { PathUpdateErrorBand } from "./PathUpdateErrorBand";
import { ReachedTargetBand } from "@/app/_client/viewport2d/bathroom-navigation-mode/ReachedTargetBand";
import { NearestBathroom as NearestBathroomConsts } from "../../ComponentConstants";

export type BathroomActiveNavigationProps = {
  globeRef: RefObject<GlobeViewportHandle | null>;
};

function bathroomActiveNavigationSessionKey(
  targetBathroomId: number,
  targetLatitude: number,
  targetLongitude: number,
): string {
  return `${targetBathroomId}:${targetLatitude}:${targetLongitude}`;
}

export function BathroomActiveNavigation({
  globeRef,
}: BathroomActiveNavigationProps) {
  const clientGeo = useClientGeo();
  const clientGeoRef = useClientGeoRef();
  const {
    activeNavigation,
    activeNavigationPaused,
    setActiveNavigationPaused,
    clearActiveNavigation,
  } = useBathroomNavigationMode();
  const [showReachedBand, setShowReachedBand] = useState(false);
  const [pathUpdateErrorMessage, setPathUpdateErrorMessage] = useState<string | null>(
    null,
  );
  const pathTrackerRef = useRef(
    initialPathUpdateTracker(
      readClientStartPos(null, clientGeoRef.current),
    ),
  );
  const pathRequestInFlightRef = useRef(false);
  const activeNavigationRef = useRef(activeNavigation);
  activeNavigationRef.current = activeNavigation;
  const activeNavigationPausedRef = useRef(activeNavigationPaused);
  activeNavigationPausedRef.current = activeNavigationPaused;
  const lastPathPointsRef = useRef<readonly PersistedPathPoint[] | undefined>(
    activeNavigation?.lastPathPoints,
  );

  const navigationSessionKey = activeNavigation
    ? bathroomActiveNavigationSessionKey(
        activeNavigation.targetBathroomId,
        activeNavigation.targetLatitude,
        activeNavigation.targetLongitude,
      )
    : null;

  useEffect(() => {
    if (navigationSessionKey === null) return;
    lastPathPointsRef.current = activeNavigation?.lastPathPoints;
  }, [activeNavigation?.lastPathPoints, navigationSessionKey]);

  const handleReachedTarget = useCallback(() => {
    setPathUpdateErrorMessage(null);
    globeRef.current?.clearPath();
    clearActiveNavigation();
    setShowReachedBand(true);
    window.setTimeout(() => {
      setShowReachedBand(false);
    }, NearestBathroomConsts.BATHROOM_REACHED_TARGET_BAND_DURATION_MS);
  }, [clearActiveNavigation, globeRef]);

  const renderFrozenPath = useCallback(() => {
    const points = lastPathPointsRef.current;
    if (!points?.length) return;
    void globeRef.current?.waitForViewer().then(() => {
      globeRef.current?.setPathFromLatLonPoints([...points]);
    });
  }, [globeRef]);

  const fetchPathUpdate = useCallback(async (startPos: LatLong) => {
    const navigation = activeNavigationRef.current;
    if (!navigation) {
      return resolvePathUpdateRequestOutcome({ val: null, errorMsg: "inactive" });
    }

    const result = await runAbortableTimeout(
      (_signal) =>
        ServerPathfind.getPathBetweenPoints({
          profile: "foot-walking",
          startLatitude: startPos.latitude,
          startLongitude: startPos.longitude,
          endLatitude: navigation.targetLatitude,
          endLongitude: navigation.targetLongitude,
        }),
      NearestBathroomConsts.BATHROOM_PATH_UPDATE_REQUEST_TIMEOUT_MS,
    );
    return resolvePathUpdateRequestOutcome(result);
  }, []);

  const applyPathUpdateOutcome = useCallback(
    (
      outcome: ReturnType<typeof resolvePathUpdateRequestOutcome>,
      startLocation: ReturnType<typeof readClientStartPos>,
      requestStartedAtMs: number,
    ) => {
      if (outcome.kind === "success") {
        setPathUpdateErrorMessage(null);
        pathTrackerRef.current = pathUpdateTrackerAfterPathRequest(
          pathTrackerRef.current,
          {
            startLocation,
            requestStartedAtMs,
            points: outcome.points,
          },
        );
        globeRef.current?.setPathFromLatLonPoints(outcome.points);
        lastPathPointsRef.current = outcome.points;
        try {
          persistLastPathPointsToStorage(window.localStorage, outcome.points);
        } catch {
          // private mode / quota
        }
        return;
      }

      pathTrackerRef.current = pathUpdateTrackerAfterPathRequest(
        pathTrackerRef.current,
        { startLocation, requestStartedAtMs, points: null },
      );

      if (shouldShowPathUpdateErrorBand(outcome)) {
        setPathUpdateErrorMessage(
          pathUpdateErrorBandMessage(
            outcome.reason,
            NearestBathroomConsts.BATHROOM_PATH_UPDATE_ERROR_BAND_MESSAGE_ERROR,
            NearestBathroomConsts.BATHROOM_PATH_UPDATE_ERROR_BAND_MESSAGE_TIMEOUT,
          ),
        );
      }
    },
    [globeRef],
  );

  const runPathUpdateRequest = useCallback(async () => {
    if (
      !activeNavigationRef.current ||
      pathRequestInFlightRef.current ||
      activeNavigationPausedRef.current
    ) {
      return;
    }

    const startPos = readClientStartPos(globeRef.current, clientGeoRef.current);
    const requestStartedAtMs = performance.now();
    pathRequestInFlightRef.current = true;
    pathTrackerRef.current = pathUpdateTrackerAtRequestStart(
      pathTrackerRef.current,
      requestStartedAtMs,
    );

    try {
      const outcome = await fetchPathUpdate(startPos);
      applyPathUpdateOutcome(outcome, startPos, requestStartedAtMs);
    } finally {
      pathRequestInFlightRef.current = false;
    }
  }, [applyPathUpdateOutcome, clientGeoRef, fetchPathUpdate, globeRef]);

  useEffect(() => {
    if (!activeNavigation) {
      setActiveNavigationPaused(false);
      setPathUpdateErrorMessage(null);
      globeRef.current?.clearPath();
      return;
    }

    if (shouldPauseBathroomActiveNavigation(activeNavigation, clientGeo)) {
      setActiveNavigationPaused(true);
      renderFrozenPath();
      return;
    }

    setActiveNavigationPaused(false);
  }, [
    activeNavigation,
    clientGeo,
    globeRef,
    renderFrozenPath,
    setActiveNavigationPaused,
  ]);

  useEffect(() => {
    if (!navigationSessionKey || activeNavigationPaused) {
      return;
    }

    const navigation = activeNavigationRef.current;
    if (!navigation) {
      return;
    }

    const target = {
      latitude: navigation.targetLatitude,
      longitude: navigation.targetLongitude,
    };

    let cancelled = false;
    let pollIntervalId: number | undefined;

    const runPollTick = () => {
      const tick = evaluatePathPollTick({
        readCurrentLocation: () =>
          readClientStartPos(globeRef.current, clientGeoRef.current),
        tracker: pathTrackerRef.current,
        target,
        nowMs: performance.now(),
        debounceDurationMs: NearestBathroomConsts.BATHROOM_PATH_UPDATE_DEBOUNCE_MS,
        minDistanceM: NearestBathroomConsts.BATHROOM_PATH_UPDATE_MIN_DISTANCE_M,
        arrivalDistanceM: NearestBathroomConsts.BATHROOM_ARRIVAL_DISTANCE_M,
      });
      if (tick.reachedTarget) {
        if (pollIntervalId !== undefined) {
          window.clearInterval(pollIntervalId);
        }
        handleReachedTarget();
        return true;
      }
      if (tick.requestPathUpdate) {
        void runPathUpdateRequest();
      }
      return false;
    };

    const beginPathPolling = () => {
      if (cancelled) return;

      const currentPos = readClientStartPos(globeRef.current, clientGeoRef.current);
      if (
        hasReachedBathroomTarget(
          currentPos,
          target,
          NearestBathroomConsts.BATHROOM_ARRIVAL_DISTANCE_M,
        )
      ) {
        handleReachedTarget();
        return;
      }

      pathTrackerRef.current = initialPathUpdateTracker(
        pathUpdateTrackerOriginLocation(navigation, currentPos),
      );
      if (runPollTick()) {
        return;
      }

      pollIntervalId = window.setInterval(() => {
        runPollTick();
      }, NearestBathroomConsts.PATH_POLL_INTERVAL_MS);
    };

    void globeRef.current?.waitForViewer().then(() => {
      if (!cancelled) beginPathPolling();
    });

    return () => {
      cancelled = true;
      if (pollIntervalId !== undefined) {
        window.clearInterval(pollIntervalId);
      }
    };
  }, [
    navigationSessionKey,
    activeNavigationPaused,
    clientGeoRef,
    globeRef,
    handleReachedTarget,
    runPathUpdateRequest,
  ]);

  return (
    <>
      <PathUpdateErrorBand message={pathUpdateErrorMessage} />
      <ReachedTargetBand visible={showReachedBand} />
    </>
  );
}
