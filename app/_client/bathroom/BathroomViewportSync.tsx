"use client";

import { useEffect, useRef, type RefObject } from "react";

import { type Errorable } from "../../_shared/Utils";
import {
  type BathroomClientCacheEntry,
  type BathroomSyncResponse,
  type ViewportBounds,
} from "../../_shared/BathroomDataPrimary";
import {
  BathroomLocalDB,
  BathroomMapMarker,
  BathroomRemoteDB,
} from "../ComponentConstants";
import { syncBathroomsInGlobeViewport } from "../Bathroom";
import { type BathroomLocalDbPort } from "../local-db/LocalDbPort";
import { type GlobeViewportHandle } from "../globe/GlobeViewport";
import {
  installBathroomMarkers,
  type BathroomMarkersHandle,
} from "../globe/BathroomMarkers";
import { loadCesium } from "../globe/loadCesium";
import {
  isCameraCloseEnoughForBathroomQuery,
  isGlobeViewportCameraSampleReady,
} from "../pure/bathroom/BathroomViewportQuery";
import {
  type RenderedBathroomMap,
  renderedBathroomsToArray,
} from "../pure/bathroom/RenderedBathrooms";
import {
  runBathroomViewportLocalSync,
  runBathroomViewportRemoteSync,
} from "../pure/bathroom/BathroomViewportSyncPipeline";
import { planLocalViewportSyncSchedule } from "../pure/bathroom/BathroomLocalSyncDelay";
import {
  initialRemoteSyncGateState,
  remoteSyncCompleted,
  remoteSyncRetryDelayMs,
  remoteSyncStarted,
  shouldAllowNewRemoteRequest,
  type RemoteSyncGateState,
} from "../pure/bathroom/BathroomViewportRemoteGate";
import { getBathroomLocalDb } from "../local-db/web/LocalDbWeb";

type BathroomViewportSyncProps = {
  globeRef: RefObject<GlobeViewportHandle | null>;
};

export type BathroomViewportSyncRemoteFn = (
  bounds: ViewportBounds,
  clientCache: BathroomClientCacheEntry[],
) => Promise<Errorable<BathroomSyncResponse>>;

export type BathroomViewportSyncRunnerDeps = {
  globe: Pick<GlobeViewportHandle, "getCameraHeightM" | "getViewportBoundsLatLon">;
  requestId: number;
  maxQueryCameraHeightM: number;
  localDbPort: BathroomLocalDbPort;
  isRequestCurrent: (requestId: number) => boolean;
  syncRemote: BathroomViewportSyncRemoteFn;
  onRenderedBathroomsChange: (rendered: RenderedBathroomMap) => void;
  onClearBathrooms: () => void;
  onRemoteSyncError?: (errorMsg: string) => void;
  /** When true, only hydrate from the local cache (no remote request). */
  localOnly?: boolean;
  /** Prior rendered state; preserves remote-fetch debug flags across local re-reads. */
  previousRendered?: RenderedBathroomMap;
};

export async function runBathroomViewportSyncForGlobe(
  deps: BathroomViewportSyncRunnerDeps,
): Promise<void> {
  const cameraHeightM = deps.globe.getCameraHeightM();
  if (!isGlobeViewportCameraSampleReady(cameraHeightM)) {
    return;
  }
  if (
    !isCameraCloseEnoughForBathroomQuery(
      cameraHeightM,
      deps.maxQueryCameraHeightM,
    )
  ) {
    deps.onClearBathrooms();
    return;
  }

  const bounds = deps.globe.getViewportBoundsLatLon();
  if (!bounds) return;

  const rendered = await runBathroomViewportLocalSync({
    requestId: deps.requestId,
    bounds,
    localDbPort: deps.localDbPort,
    isRequestCurrent: deps.isRequestCurrent,
    onRenderedBathroomsChange: deps.onRenderedBathroomsChange,
    previousRendered: deps.previousRendered,
  });
  if (rendered === null || deps.localOnly) {
    return;
  }

  await runBathroomViewportRemoteSync({
    requestId: deps.requestId,
    bounds,
    localDbPort: deps.localDbPort,
    isRequestCurrent: deps.isRequestCurrent,
    syncRemote: deps.syncRemote,
    onRenderedBathroomsChange: deps.onRenderedBathroomsChange,
    onRemoteSyncError: deps.onRemoteSyncError,
    initialRendered: rendered,
  });
}

export function BathroomViewportSync({ globeRef }: BathroomViewportSyncProps) {
  const renderedRef = useRef<RenderedBathroomMap>(new Map());
  const markersRef = useRef<BathroomMarkersHandle | null>(null);
  const markersViewerTokenRef = useRef(0);
  const localDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);
  const remoteGateRef = useRef<RemoteSyncGateState>(initialRemoteSyncGateState());
  const localDb = useRef(getBathroomLocalDb());

  const syncMarkersFromRendered = (previousRendered?: RenderedBathroomMap) => {
    const globe = globeRef.current;
    if (!globe || !markersRef.current) {
      return;
    }
    const viewportBounds = globe.getViewportBoundsLatLon();
    if (!viewportBounds) {
      return;
    }

    markersRef.current.sync({
      current: renderedBathroomsToArray(renderedRef.current),
      previous: previousRendered,
      viewportCenter: globe.getViewportCenterLatLon(),
      viewportBounds,
      destroyDistanceFromCenterM:
        BathroomMapMarker.DESTROY_DISTANCE_FROM_VIEWPORT_CENTER,
    });
  };

  const clearBathrooms = () => {
    renderedRef.current = new Map();
    markersRef.current?.stopRendering();
  };

  const clearBathroomsIfZoomedOut = () => {
    const globe = globeRef.current;
    if (!globe) return;

    const cameraHeightM = globe.getCameraHeightM();
    if (!isGlobeViewportCameraSampleReady(cameraHeightM)) return;
    if (
      !isCameraCloseEnoughForBathroomQuery(
        cameraHeightM,
        BathroomMapMarker.MAX_QUERY_CAMERA_HEIGHT_M,
      )
    ) {
      requestSeqRef.current += 1;
      clearBathrooms();
    }
  };

  const clearRemoteRetryTimer = () => {
    if (remoteRetryTimerRef.current !== null) {
      clearTimeout(remoteRetryTimerRef.current);
      remoteRetryTimerRef.current = null;
    }
  };

  const scheduleRemoteRetry = () => {
    clearRemoteRetryTimer();
    const delayMs = remoteSyncRetryDelayMs(
      remoteGateRef.current,
      Date.now(),
      BathroomRemoteDB.READ_RETRY_MS,
    );
    if (delayMs === null || delayMs <= 0) {
      return;
    }

    remoteRetryTimerRef.current = setTimeout(() => {
      remoteRetryTimerRef.current = null;
      if (
        shouldAllowNewRemoteRequest(
          remoteGateRef.current,
          Date.now(),
          BathroomRemoteDB.READ_RETRY_MS,
        )
      ) {
        void runRemoteViewportSync(++requestSeqRef.current);
      }
    }, delayMs);
  };

  const runRemoteViewportSync = async (requestId: number) => {
    const globe = globeRef.current;
    if (!globe) return;

    const cameraHeightM = globe.getCameraHeightM();
    if (
      !isGlobeViewportCameraSampleReady(cameraHeightM) ||
      !isCameraCloseEnoughForBathroomQuery(
        cameraHeightM,
        BathroomMapMarker.MAX_QUERY_CAMERA_HEIGHT_M,
      )
    ) {
      return;
    }

    const bounds = globe.getViewportBoundsLatLon();
    if (!bounds) return;

    remoteGateRef.current = remoteSyncStarted(Date.now());
    scheduleRemoteRetry();

    try {
      await runBathroomViewportRemoteSync({
        requestId,
        bounds,
        localDbPort: localDb.current,
        isRequestCurrent: (activeRequestId) => activeRequestId === requestSeqRef.current,
        syncRemote: syncBathroomsInGlobeViewport,
        initialRendered: renderedRef.current,
        onRenderedBathroomsChange: (rendered) => {
          const previousRendered = renderedRef.current;
          renderedRef.current = rendered;
          syncMarkersFromRendered(previousRendered);
        },
        onRemoteSyncError: (errorMsg) => {
          console.error(errorMsg);
        },
      });
    } finally {
      remoteGateRef.current = remoteSyncCompleted();
      clearRemoteRetryTimer();
    }
  };

  const maybeStartRemoteViewportSync = () => {
    if (
      !shouldAllowNewRemoteRequest(
        remoteGateRef.current,
        Date.now(),
        BathroomRemoteDB.READ_RETRY_MS,
      )
    ) {
      scheduleRemoteRetry();
      return;
    }

    void runRemoteViewportSync(++requestSeqRef.current);
  };

  const runLocalViewportSync = async (requestId: number) => {
    const globe = globeRef.current;
    if (!globe) return;

    await runBathroomViewportSyncForGlobe({
      globe,
      requestId,
      maxQueryCameraHeightM: BathroomMapMarker.MAX_QUERY_CAMERA_HEIGHT_M,
      localDbPort: localDb.current,
      isRequestCurrent: (activeRequestId) => activeRequestId === requestSeqRef.current,
      syncRemote: syncBathroomsInGlobeViewport,
      localOnly: true,
      previousRendered: renderedRef.current,
      onRenderedBathroomsChange: (rendered) => {
        const previousRendered = renderedRef.current;
        renderedRef.current = rendered;
        syncMarkersFromRendered(previousRendered);
      },
      onClearBathrooms: clearBathrooms,
      onRemoteSyncError: (errorMsg) => {
        console.error(errorMsg);
      },
    });

    maybeStartRemoteViewportSync();
  };

  const scheduleLocalViewportSync = () => {
    const plan = planLocalViewportSyncSchedule(
      localDelayTimerRef.current !== null,
      BathroomLocalDB.QUERY_DELAY_MS,
    );
    if (plan.kind === "skip") {
      return;
    }

    localDelayTimerRef.current = setTimeout(() => {
      localDelayTimerRef.current = null;
      void runLocalViewportSync(++requestSeqRef.current);
    }, plan.delayMs);
  };

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    let cancelled = false;
    const token = ++markersViewerTokenRef.current;

    void (async () => {
      const viewer = await globe.waitForViewer();
      if (cancelled || token !== markersViewerTokenRef.current) return;

      const Cesium = await loadCesium();
      markersRef.current?.destroy();
      markersRef.current = installBathroomMarkers(Cesium, viewer);
      syncMarkersFromRendered();
      globe.requestViewportResync();
    })();

    return () => {
      cancelled = true;
      markersRef.current?.destroy();
      markersRef.current = null;
    };
  }, [globeRef]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const onViewportChange = () => {
      clearBathroomsIfZoomedOut();
      scheduleLocalViewportSync();
    };

    const unsubscribe = globe.subscribeViewportChanges(onViewportChange);
    onViewportChange();

    return () => {
      unsubscribe();
      if (localDelayTimerRef.current !== null) {
        clearTimeout(localDelayTimerRef.current);
        localDelayTimerRef.current = null;
      }
      clearRemoteRetryTimer();
      requestSeqRef.current += 1;
      remoteGateRef.current = remoteSyncCompleted();
    };
  }, [globeRef]);

  return null;
}
