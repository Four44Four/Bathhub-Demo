import type * as CesiumTypes from "cesium";

import { MapMarker as MapMarkerConsts } from "../ComponentConstants";
import { installGlobeImage } from "./GlobeImage";

/** Reads the shared viewport-center cache (updated by `GlobeViewport` on a timer). */
export type MapMarkerCachedViewportCenter = () => {
  latitude: number;
  longitude: number;
} | null;

export type MapMarkerHandle = {
  /** Re-apply the cached viewport center to the billboard (no-op when geolocation is active). */
  refreshViewportFollowFromCache: () => void;
  destroy: () => void;
};

const GEO_WATCH_OPTS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
};

/**
 * “You are here” marker: follows the viewport center until geolocation is available,
 * then snaps to (and tracks) the device position. Billboard anchor is bottom-center
 * on the ground point (with a small lift matching `ClickedIndicator`).
 */
export function installMapMarker(
  Cesium: typeof CesiumTypes,
  viewer: CesiumTypes.Viewer,
  getCachedViewportCenter: MapMarkerCachedViewportCenter,
): MapMarkerHandle {
  const scene = viewer.scene;

  const heightM = 10;

  const globeImage = installGlobeImage(Cesium, viewer, {
    name: "MapMarker",
    color: MapMarkerConsts.COLOR,
    opacity: MapMarkerConsts.OPACITY,
    image: MapMarkerConsts.IMAGE,
    size: MapMarkerConsts.SIZE,
    heightAboveEllipsoidM: heightM,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
  });

  let geoLocked = false;

  const lockToGeolocation = (latDeg: number, lonDeg: number) => {
    geoLocked = true;
    globeImage.setLatLonDegrees(latDeg, lonDeg);
    globeImage.setVisible(true);
    scene.requestRender();
  };

  const refreshViewportFollowFromCache = () => {
    if (geoLocked) return;
    const p = getCachedViewportCenter();
    if (!p) return;
    globeImage.setLatLonDegrees(p.latitude, p.longitude);
    globeImage.setVisible(true);
    scene.requestRender();
  };

  let watchId: number | null = null;
  let cancelled = false;

  let permListener: { status: PermissionStatus; fn: () => void } | null = null;

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
