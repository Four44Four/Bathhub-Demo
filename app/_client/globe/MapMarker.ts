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
  destroy: () => void;
};

const GEO_WATCH_OPTS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
};

/**
 * “You are here” marker: until a geolocation fix is available (permission denied,
 * prompt, or watch pending), use screen-space UI via `onStaticOverlayModeChange`.
 * After a fix, the Cesium billboard tracks the device position. Billboard anchor is
 * bottom-center on the ground point (with a small lift matching `ClickedIndicator`).
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

  const notifyStaticOverlay = (useStatic: boolean) => {
    if (cancelled) return;
    onStaticOverlayModeChange?.(useStatic);
  };

  const lockToGeolocation = (latDeg: number, lonDeg: number) => {
    geoLocked = true;
    globeImage.setLatLonDegrees(latDeg, lonDeg);
    globeImage.setVisible(true);
    notifyStaticOverlay(false);
    scene.requestRender();
  };

  const refreshViewportFollowFromCache = () => {
    if (geoLocked) return;
    // Viewport-follow mode uses the fixed screen overlay; keep billboard hidden.
    globeImage.setVisible(false);
    scene.requestRender();
  };

  let watchId: number | null = null;

  let permListener: { status: PermissionStatus; fn: () => void } | null = null;

  globeImage.setVisible(false);
  notifyStaticOverlay(true);

  const requestGeoSnap = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => lockToGeolocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      GEO_WATCH_OPTS,
    );
  };

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => lockToGeolocation(pos.coords.latitude, pos.coords.longitude),
      () => {
        // Denied / unavailable: continue using viewport center until permission changes.
      },
      GEO_WATCH_OPTS,
    );

    void (async () => {
      try {
        if (cancelled || !navigator.permissions?.query) return;
        const status = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        if (cancelled) return;

        const onPermChange = () => {
          if (cancelled || status.state !== "granted") return;
          requestGeoSnap();
        };

        status.addEventListener("change", onPermChange);
        permListener = { status, fn: onPermChange };

        if (status.state === "granted") requestGeoSnap();
      } catch {
        // Permissions API missing — `watchPosition` still handles the prompt/grant flow.
      }
    })();
  }

  return {
    refreshViewportFollowFromCache,
    destroy: () => {
      cancelled = true;
      if (permListener) {
        permListener.status.removeEventListener("change", permListener.fn);
        permListener = null;
      }
      if (watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      globeImage.destroy();
    },
  };
}
