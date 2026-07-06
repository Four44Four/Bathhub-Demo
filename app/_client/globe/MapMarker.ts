import type * as CesiumTypes from "cesium";

import { MapMarker as MapMarkerConsts } from "../ComponentConstants";
import { installGlobeImage } from "./GlobeImage";

/** Reads the shared viewport-center cache (updated by `GlobeViewport` on a timer). */
export type MapMarkerCachedViewportCenter = () => {
  latitude: number;
  longitude: number;
} | null;

export type MapMarkerHandle = {
  /** Viewport-center sampler hook; keeps the billboard hidden while static overlay mode is active. */
  refreshViewportFollowFromCache: () => void;
  /**
   * Push the user's geolocation from the centralized user geolocation calculator.
   * Immediately switches from the static 2D overlay to the 3D billboard at the
   * supplied lat/lon and locks subsequent viewport-follow updates out.
   * Idempotent; repeated calls just reposition the billboard.
   */
  setUserLatLonDegrees: (latDeg: number, lonDeg: number) => void;
  /** Latest device position when geo-locked; null before the first fix. */
  getUserLatLonDegrees: () => { latitude: number; longitude: number } | null;
  destroy: () => void;
};

export type MapMarkerInitOptions = {
  /**
   * If non-null, MapMarker starts already locked to this geolocation (3D billboard
   * mode, no static overlay). Used by the parent (`GlobeViewport`) on re-install so
   * a previously-known user position survives a Cesium viewer rebuild without
   * waiting for the centralized tracker to replay the position.
   */
  initialUserLatLonDegrees?: { latitude: number; longitude: number } | null;
  /** Called whenever the marker locks to a new device position (push from parent). */
  onUserLatLonChange?: (latDeg: number, lonDeg: number) => void;
};

/**
 * “You are here” marker: until a geolocation fix is available (permission denied,
 * prompt, or watch pending), use screen-space UI via `onStaticOverlayModeChange`.
 * After a fix, the Cesium billboard tracks the device position. Billboard anchor is
 * bottom-center on the ground point (with a small lift matching `ClickedIndicator`).
 *
 * The parent (`GlobeViewport` / `page.tsx`) pushes the user's confirmed geolocation
 * via `MapMarkerHandle.setUserLatLonDegrees` from the centralized user geolocation
 * calculator.
 */
export function installMapMarker(
  Cesium: typeof CesiumTypes,
  viewer: CesiumTypes.Viewer,
  getCachedViewportCenter: MapMarkerCachedViewportCenter,
  /**
   * When true, the host should render a fixed 2D marker (same SIZE as `GlobeImage`)
   * centered on the viewport; the billboard stays hidden. When false, the billboard
   * is used and the overlay should be removed.
   */
  onStaticOverlayModeChange?: (useStaticOverlay: boolean) => void,
  options?: MapMarkerInitOptions,
): MapMarkerHandle {
  const scene = viewer.scene;

  const globeImage = installGlobeImage(Cesium, viewer, {
    name: "MapMarker",
    color: MapMarkerConsts.COLOR,
    opacity: MapMarkerConsts.OPACITY,
    image: MapMarkerConsts.IMAGE,
    size: MapMarkerConsts.SIZE,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
  });

  let geoLocked = false;
  let cancelled = false;
  let userLatLonDegrees: { latitude: number; longitude: number } | null = null;

  const notifyStaticOverlay = (useStatic: boolean) => {
    if (cancelled) return;
    onStaticOverlayModeChange?.(useStatic);
  };

  const lockToGeolocation = (latDeg: number, lonDeg: number) => {
    if (cancelled) return;
    geoLocked = true;
    userLatLonDegrees = { latitude: latDeg, longitude: lonDeg };
    globeImage.setLatLonDegrees(latDeg, lonDeg);
    globeImage.setVisible(true);
    notifyStaticOverlay(false);
    options?.onUserLatLonChange?.(latDeg, lonDeg);
    scene.requestRender();
  };

  const refreshViewportFollowFromCache = () => {
    if (geoLocked) return;
    // Viewport-follow mode uses the fixed screen overlay; keep billboard hidden.
    globeImage.setVisible(false);
    scene.requestRender();
  };

  const initialUser = options?.initialUserLatLonDegrees ?? null;
  if (initialUser) {
    lockToGeolocation(initialUser.latitude, initialUser.longitude);
  } else {
    globeImage.setVisible(false);
    notifyStaticOverlay(true);
  }

  return {
    refreshViewportFollowFromCache,
    setUserLatLonDegrees: (latDeg: number, lonDeg: number) => {
      if (cancelled) return;
      lockToGeolocation(latDeg, lonDeg);
    },
    getUserLatLonDegrees: () => userLatLonDegrees,
    destroy: () => {
      cancelled = true;
      globeImage.destroy();
    },
  };
}
