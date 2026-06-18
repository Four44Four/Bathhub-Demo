import { navigateGlobeToLatLon } from "./GlobeMovementNavigation";
import { forceGlobeBathroomViewportQuery } from "../../Bathroom";

export type SavedGlobeCameraState = {
  centerLatitude: number;
  centerLongitude: number;
  /** Orbit camera center distance (meters from globe center); matches interactive zoom level. */
  orbitCenterDistanceM: number;
};

export type GlobeCameraStateReader = {
  getViewportCenterLatLon: () => {
    latitude: number;
    longitude: number;
  } | null;
  getOrbitCenterDistanceM: () => number;
};

export type GlobeCameraCaptureHandle = GlobeCameraStateReader & {
  requestViewportResync?: () => void;
};

/** Fresh viewport center + zoom at user interaction time (e.g. Find nearest bathroom click). */
export function captureGlobeCameraStateAtInteraction(
  globe: GlobeCameraCaptureHandle | null,
  viewportCenterFallback: { latitude: number; longitude: number },
): SavedGlobeCameraState {
  globe?.requestViewportResync?.();
  return readSavedGlobeCameraState(globe, viewportCenterFallback);
}

export function readSavedGlobeCameraState(
  globe: GlobeCameraStateReader | null,
  fallbackCenter: { latitude: number; longitude: number },
): SavedGlobeCameraState {
  const center = globe?.getViewportCenterLatLon() ?? fallbackCenter;
  const orbitCenterDistanceM = globe?.getOrbitCenterDistanceM();
  return {
    centerLatitude: center.latitude,
    centerLongitude: center.longitude,
    orbitCenterDistanceM:
      orbitCenterDistanceM !== undefined && Number.isFinite(orbitCenterDistanceM)
        ? orbitCenterDistanceM
        : Number.POSITIVE_INFINITY,
  };
}

export type GlobeCameraRestoreHandle = {
  animateTo: (lat: number, long: number, durationMs?: number) => void;
  animateZoomToOrbitCenterDistanceM: (
    centerDistanceM: number,
    durationMs?: number,
  ) => void;
  beginGeoArrivalInteractionLock: () => void;
  snapTo: (lat: number, long: number) => void;
  snapZoomToOrbitCenterDistanceM: (centerDistanceM: number) => void;
};

export function restoreGlobeCameraState(
  globe: GlobeCameraRestoreHandle | null,
  state: SavedGlobeCameraState,
  globeMovementSmooth: boolean,
  animationDurationMs: number,
): void {
  if (!globe) return;

  if (globeMovementSmooth) {
    globe.beginGeoArrivalInteractionLock();
    globe.animateTo(state.centerLatitude, state.centerLongitude, animationDurationMs);
    globe.animateZoomToOrbitCenterDistanceM(
      state.orbitCenterDistanceM,
      animationDurationMs,
    );
    return;
  }

  globe.snapTo(state.centerLatitude, state.centerLongitude);
  globe.snapZoomToOrbitCenterDistanceM(state.orbitCenterDistanceM);
}

type GlobeBathroomPreviewNavigationHandle = NonNullable<
  Parameters<typeof navigateGlobeToLatLon>[0]["globe"]
> & {
  requestViewportResync?: () => void;
};

/** Centers on the found bathroom at the globe's Init camera height user setting. */
export function navigateGlobeToBathroomPreview(
  globe: GlobeBathroomPreviewNavigationHandle | null,
  latitude: number,
  longitude: number,
  globeMovementSmooth: boolean,
  animationDurationMs: number,
): void {
  navigateGlobeToLatLon(
    { globe, globeMovementSmooth, animationDurationMs },
    latitude,
    longitude,
    () => {
      forceGlobeBathroomViewportQuery(globe);
    },
  );
}
