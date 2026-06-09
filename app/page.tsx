
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Recenter } from "./_client/viewport2d/buttons/Recenter";
import { TestDBCreate } from "./_client/viewport2d/buttons/TestDBCreate";
import { TestDBRead } from "./_client/viewport2d/buttons/TestDBRead";
import { TestDBRemove } from "./_client/viewport2d/buttons/TestDBRemove";
import { TestDBUpdate } from "./_client/viewport2d/buttons/TestDBUpdate";
import { TestPathfind } from "./_client/viewport2d/buttons/TestPathfind";
import {
  GlobeViewport,
  type GlobeViewportHandle,
} from "./_client/globe/GlobeViewport";
import { CesiumAttribution } from "./_client/viewport2d/CesiumAttribution";
import { ZoomIndicator } from "./_client/viewport2d/ZoomIndicator";
import { MainMenu } from "./_client/swipeup/MainMenu";
import { SwipeMenuBackdrop } from "./_client/swipeup/SwipeMenuBackdrop";
import {
  SwipeMenuInteractionContext,
  type SwipeMenuInteraction,
} from "./_client/swipeup/SwipeMenuInteraction";
import { FindNearestBathroom } from "./_client/swipeup/buttons/FindNearestBathroom";
import { RegisterNewBathroom } from "./_client/swipeup/buttons/RegisterNewBathroom";
import { AlertSystemProvider } from "./_client/viewport2d/AlertSystem";
import { Globe as GlobeConsts } from "./_client/ComponentConstants";

/** When set to `"100%"`, the globe mount fills the virtual phone frame (see `layout.tsx`) and the initial camera distance is chosen so the globe “covers” the view (no letterboxing; excess clips on the shorter axis). */
const GLOBE_VIEWPORT_WIDTH = "100%";
const GLOBE_VIEWPORT_HEIGHT = "100%";

/** Set when geolocation is active for this client (instant bootstrap or post-grant snap/animate). */
let isClientGeoGranted = false;

/**
 * Module-level mutable globe-center coordinates. Default to (0, 0) when the
 * client has no geolocation permission (or denies the prompt). Updated to the
 * client's current position whenever geolocation data becomes available.
 *
 * Kept at module scope (rather than inside `Home()`) so the geolocation flow
 * can mutate them in place; the React state below mirrors them whenever the
 * `<GlobeViewport>` actually needs to be re-initialized.
 */
let mapInitLat = 0.0;
let mapInitLong = 0.0;

const GEO_CACHE_KEY = "bathhub_last_geo_v1";

function readGeoCache(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
    if (typeof p.lat !== "number" || typeof p.lng !== "number") return null;
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
    return { lat: p.lat, lng: p.lng };
  } catch {
    return null;
  }
}

function writeGeoCache(lat: number, lng: number) {
  try {
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ lat, lng }));
  } catch {
    // quota / private mode
  }
}

export default function Home() {
  const phoneFrameRef = useRef<HTMLDivElement | null>(null);
  const globeRootRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeViewportHandle | null>(null);
  /**
   * Recenter mounts only when geolocation permission is `granted` (Permissions API),
   * or once a live fix arrives where the Permissions API is unavailable (e.g. Safari).
   */
  const [showRecenterButton, setShowRecenterButton] = useState(false);
  const [zoomIndicator, setZoomIndicator] = useState<{ x: number; y: number; pulse: number }>({
    x: 0,
    y: 0,
    pulse: 0,
  });
  const [swipeMenuInteraction, setSwipeMenuInteraction] =
    useState<SwipeMenuInteraction>({
      blocksViewportPointer: false,
      backdropOpacity: 0,
    });
  // Bumped when module-level `mapInitLat` / `mapInitLong` / `isClientGeoGranted`
  // update without a `setGlobeInit` (e.g. geo animate-on-init) so consumers like
  // `<TestPathfind>` re-render with fresh coordinates.
  const [, setPathfindDepsEpoch] = useState(0);
  const bumpPathfindDeps = () => setPathfindDepsEpoch((n) => n + 1);

  // Mirrors the module-level mapInitLat/mapInitLong. Updating this state
  // re-renders Home() and feeds new initLat/initLong props into <GlobeViewport>,
  // which causes its useEffect to tear down + re-init the Cesium viewer.
  // We only update it for the "permission already granted" case so the
  // "accepted later" case can use the cheap animation path instead.
  const [globeInit, setGlobeInit] = useState<{
    lat: number;
    long: number;
    /** Session/cache bootstrap: start globe framing + zoom like post-geolocation (no fly-in). */
    snapInitialView: boolean;
  }>({
    lat: mapInitLat,
    long: mapInitLong,
    snapInitialView: false,
  });

  const globeInitRef = useRef(globeInit);
  globeInitRef.current = globeInit;

  useLayoutEffect(() => {
    const cached = readGeoCache();
    if (!cached) return;
    mapInitLat = cached.lat;
    mapInitLong = cached.lng;
    setGlobeInit({ lat: cached.lat, long: cached.lng, snapInitialView: true });
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;

    let cancelled = false;
    let geoPermStatus: PermissionStatus | null = null;

    const onPermissionChange = () => {
      if (cancelled || !geoPermStatus) return;
      setShowRecenterButton(geoPermStatus.state === "granted");
    };

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (cancelled) return;
        geoPermStatus = status;
        setShowRecenterButton(status.state === "granted");
        status.addEventListener("change", onPermissionChange);
      })
      .catch(() => {
        /* Unsupported or restricted — rely on first successful geolocation callback. */
      });

    return () => {
      cancelled = true;
      geoPermStatus?.removeEventListener("change", onPermissionChange);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let cancelled = false;
    /** Ensures we only run the init animation once. */
    let appliedUserLocation = false;
    let watchId: number | null = null;

    // Omit `timeout` so the browser waits indefinitely while the permission prompt is open.
    const geoOptions: PositionOptions = {
      enableHighAccuracy: false,
      maximumAge: 60_000,
    };

    const clearWatch = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    /**
     * When permission is already granted, resolve a fix (preferring cache via maximumAge)
     * before registering `watchPosition`, so the first watch callback cannot race ahead and
     * trigger the init animation on a 0,0 globe.
     */
    const applyInstantBootstrapPosition = (lat: number, lng: number) => {
      isClientGeoGranted = true;
      setShowRecenterButton(true);
      mapInitLat = lat;
      mapInitLong = lng;
      bumpPathfindDeps();
      writeGeoCache(lat, lng);
      // Push to MapMarker before any state change / animation so the billboard
      // is already in place if this triggers a viewer re-init below.
      globeRef.current?.setMapMarkerUserLatLon(lat, lng);
      setGlobeInit((prev) => {
        const close =
          Math.abs(prev.lat - lat) < 0.002 && Math.abs(prev.long - lng) < 0.002;
        if (close && prev.snapInitialView) return prev;
        if (prev.snapInitialView && !close) {
          queueMicrotask(() => {
            globeRef.current?.snapTo(lat, lng);
          });
          return prev;
        }
        return { lat, long: lng, snapInitialView: true };
      });
    };

    const bootstrapGrantedInstantFix = () =>
      new Promise<void>((resolve) => {
        const opts: PositionOptions = {
          maximumAge: Infinity,
          enableHighAccuracy: false,
        };
        const onFix = (pos: GeolocationPosition) => {
          if (cancelled) return;
          applyInstantBootstrapPosition(pos.coords.latitude, pos.coords.longitude);
        };

        const perms = navigator.permissions;
        if (!perms?.query) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              onFix(pos);
              resolve();
            },
            () => resolve(),
            opts,
          );
          return;
        }
        perms
          .query({ name: "geolocation" })
          .then((status) => {
            if (cancelled || status.state !== "granted") {
              resolve();
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                onFix(pos);
                resolve();
              },
              () => resolve(),
              opts,
            );
          })
          .catch(() => resolve());
      });

    const applyGeolocationPosition = (pos: GeolocationPosition) => {
      if (cancelled) return;

      const lat = pos.coords.latitude;
      const long = pos.coords.longitude;
      isClientGeoGranted = true;
      setShowRecenterButton(true);
      mapInitLat = lat;
      mapInitLong = long;
      bumpPathfindDeps();
      writeGeoCache(lat, long);
      // Switch MapMarker from the 2D static overlay to the 3D billboard FIRST,
      // so the swap is visible from the very first frame of the
      // animateTo / animateZoomToInitTarget transition below.
      globeRef.current?.setMapMarkerUserLatLon(lat, long);

      const prev = globeInitRef.current;
      const close =
        Math.abs(lat - prev.lat) < 0.002 && Math.abs(long - prev.long) < 0.002;

      if (prev.snapInitialView && close) {
        if (!appliedUserLocation) {
          appliedUserLocation = true;
          clearWatch();
        }
        return;
      }

      if (appliedUserLocation) return;
      appliedUserLocation = true;
      clearWatch();

      if (prev.snapInitialView && !close) {
        globeRef.current?.snapTo(lat, long);
        return;
      }

      if (GlobeConsts.ANIMATE_ON_INIT) {
        globeRef.current?.beginGeoArrivalInteractionLock();
        globeRef.current?.animateTo(lat, long, GlobeConsts.ANIMATE_ON_INIT_DURA);
        globeRef.current?.animateZoomToInitTarget(GlobeConsts.ANIMATE_ON_INIT_DURA);
      } else {
        setGlobeInit({ lat, long, snapInitialView: false });
        requestAnimationFrame(() => {
          globeRef.current?.snapZoomToInitTarget();
        });
      }
    };

    const onPositionError = (err: GeolocationPositionError) => {
      if (cancelled) return;
      // Hard denial ends the watch; other codes may be transient (Firefox).
      if (err.code === err.PERMISSION_DENIED) {
        clearWatch();
      }
    };

    /** Firefox: do not `await` anything before registering geolocation — a deferred
     * `getCurrentPosition` can leave the request untied from the permission prompt so
     * neither success nor error runs after a slow Allow. `watchPosition` keeps a live
     * subscription until the first fix (works better than one-shot here). */
    const startWatch = () => {
      if (cancelled || appliedUserLocation) return;
      clearWatch();
      watchId = navigator.geolocation.watchPosition(
        applyGeolocationPosition,
        onPositionError,
        geoOptions,
      );
    };

    void bootstrapGrantedInstantFix().then(() => {
      if (!cancelled) startWatch();
    });

    const retryIfStillWaiting = () => {
      if (cancelled || appliedUserLocation) return;
      if (document.visibilityState !== "visible") return;
      startWatch();
    };
    window.addEventListener("focus", retryIfStillWaiting);
    document.addEventListener("visibilitychange", retryIfStillWaiting);

    return () => {
      cancelled = true;
      clearWatch();
      window.removeEventListener("focus", retryIfStillWaiting);
      document.removeEventListener("visibilitychange", retryIfStillWaiting);
    };
  }, []);

  return (
    <AlertSystemProvider phoneViewportRef={phoneFrameRef}>
    <SwipeMenuInteractionContext.Provider value={swipeMenuInteraction}>
    <main className="flex h-full min-h-0 flex-col">
      <div ref={phoneFrameRef} className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={globeRootRef}
          className={
            swipeMenuInteraction.blocksViewportPointer
              ? "relative min-h-0 flex-1 overflow-hidden pointer-events-none touch-none"
              : "relative min-h-0 flex-1 overflow-hidden"
          }
        >
          <GlobeViewport
            ref={globeRef}
            initLat={globeInit.lat}
            initLong={globeInit.long}
            initialSnapToGeoView={globeInit.snapInitialView}
            width={GLOBE_VIEWPORT_WIDTH}
            height={GLOBE_VIEWPORT_HEIGHT}
            zoomIndicatorRootRef={globeRootRef}
            onZoomIndicatorPulse={(x, y) => {
              setZoomIndicator((z) => ({ x, y, pulse: z.pulse + 1 }));
            }}
          />
          <SwipeMenuBackdrop />
          <ZoomIndicator
            x={zoomIndicator.x}
            y={zoomIndicator.y}
            pulse={zoomIndicator.pulse}
            hidden={zoomIndicator.pulse === 0}
          />
          <TestPathfind
            globeRef={globeRef}
            isClientGeoGranted={isClientGeoGranted}
            mapInitLat={mapInitLat}
            mapInitLong={mapInitLong}
          />
          <TestDBCreate />
          <TestDBUpdate />
          <TestDBRemove />
          <TestDBRead />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end pt-1 pr-1">
          <div
            className={
              swipeMenuInteraction.blocksViewportPointer
                ? "pointer-events-none max-w-[50%] text-right"
                : "pointer-events-auto max-w-[50%] text-right"
            }
          >
            <CesiumAttribution />
          </div>
        </div>
        {showRecenterButton ? (
          <Recenter
            globeRef={globeRef}
            viewportRef={phoneFrameRef}
            isClientGeoGranted={isClientGeoGranted}
            mapInitLat={mapInitLat}
            mapInitLong={mapInitLong}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 z-40">
          <MainMenu
            viewportRef={phoneFrameRef}
            onInteractionChange={setSwipeMenuInteraction}
          >
            <FindNearestBathroom />
            <RegisterNewBathroom globeRef={globeRef} />
          </MainMenu>
        </div>
      </div>
    </main>
    </SwipeMenuInteractionContext.Provider>
    </AlertSystemProvider>
  );
}
