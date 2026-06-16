
"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Recenter } from "./_client/viewport2d/buttons/Recenter";
import { FindNearestBathroom } from "./_client/viewport2d/buttons/FindNearestBathroom";
import { TestPathfind } from "./_client/viewport2d/buttons/testing/TestPathfind";
import {
  GlobeViewport,
  type GlobeViewportHandle,
} from "./_client/globe/GlobeViewport";
import { CesiumAttribution } from "./_client/viewport2d/CesiumAttribution";
import { ZoomIndicator } from "./_client/viewport2d/ZoomIndicator";
import { MainMenu } from "./_client/swipeup/MainMenu";
import { SwipeMenuBackdrop } from "./_client/swipeup/SwipeMenuBackdrop";
import { SwipeMenuTopShadow } from "./_client/swipeup/SwipeMenuTopShadow";
import {
  SwipeMenuInteractionContext,
  type SwipeMenuInteraction,
} from "./_client/swipeup/SwipeMenuInteraction";
import { UserSettings } from "./_client/swipeup/buttons/UserSettings";
import { UserSettingsProvider } from "./_client/user-settings/UserSettingsContext";
import { UserSettingsBootstrapGate } from "./_client/user-settings/UserSettingsBootstrapGate";
import { UserSettingsDangerBand } from "./_client/user-settings/UserSettingsDangerBand";
import { UserSettingsOverlay } from "./_client/user-settings/UserSettingsOverlay";
import { RegisterNewBathroom } from "./_client/swipeup/buttons/RegisterNewBathroom";
import { AlertSystemProvider } from "./_client/viewport2d/AlertSystem";
import {
  AddBathroomMode,
  AddBathroomModeProvider,
  useAddBathroomMode,
} from "./_client/viewport2d/add-bathroom-mode";
import { Globe as GlobeConsts, SwipeMenu as SwipeMenuConsts } from "./_client/ComponentConstants";
import { navigateGlobeToLatLon } from "./_client/pure/globe/GlobeMovementNavigation";
import { useUserSettings } from "./_client/user-settings/UserSettingsContext";
import { useGlobeMovementSmoothRef } from "./_client/user-settings/useGlobeMovementSmooth";
import { USER_SETTINGS_DEFAULTS } from "./_shared/user-settings/UserSettingsSchema";
import { BathroomViewportSync } from "./_client/bathroom/BathroomViewportSync";
import { BathroomLocalDbOnAppOpen } from "./_client/local-db";
import { SWIPE_MENU_BACKDROP_Z_INDEX } from "./_client/pure/viewport2d/PositionalAlertAnchor";

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
 * Kept at module scope so geolocation callbacks and pathfinding helpers can read
 * the latest fix without prop drilling. Camera moves are driven imperatively via
 * `globeRef` — changing these does not re-init the Cesium viewer.
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

type FrozenGlobeInit = {
  lat: number;
  long: number;
  snapInitialView: boolean;
};

/** SSR-safe defaults — sessionStorage is applied after mount in `useLayoutEffect`. */
const DEFAULT_GLOBE_INIT: FrozenGlobeInit = {
  lat: mapInitLat,
  long: mapInitLong,
  snapInitialView: false,
};

function applyGeoCacheFromSession(): FrozenGlobeInit | null {
  const cached = readGeoCache();
  if (!cached) return null;
  mapInitLat = cached.lat;
  mapInitLong = cached.lng;
  return { lat: cached.lat, long: cached.lng, snapInitialView: true };
}

function snapGlobeToGeoWhenReady(
  globe: GlobeViewportHandle | null,
  lat: number,
  lng: number,
) {
  if (!globe) return;
  void globe.waitForViewer().then(() => {
    globe.setMapMarkerUserLatLon(lat, lng);
    globe.snapTo(lat, lng);
    globe.snapZoomToInitTarget();
  });
}

function HomeContent({
  phoneFrameRef,
}: {
  phoneFrameRef: RefObject<HTMLDivElement | null>;
}) {
  const { isActive: addBathroomModeActive } = useAddBathroomMode();
  const { settings } = useUserSettings();
  const cameraInitSurfaceOffsetM =
    settings?.camera_init_surface_offset_m ??
    USER_SETTINGS_DEFAULTS.camera_init_surface_offset_m;
  const globeMovementSmoothRef = useGlobeMovementSmoothRef();
  const globeRootRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeViewportHandle | null>(null);
  /** SSR-safe on first render; sessionStorage geo is merged in `useLayoutEffect` before Cesium init. */
  const [globeInit, setGlobeInit] = useState<FrozenGlobeInit>(DEFAULT_GLOBE_INIT);
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
      menuHeightPx: SwipeMenuConsts.INACTIVE_HEIGHT_PX,
    });
  // Bumped when module-level `mapInitLat` / `mapInitLong` / `isClientGeoGranted`
  // update so consumers like `<TestPathfind>` re-render with fresh coordinates.
  const [, setPathfindDepsEpoch] = useState(0);
  const bumpPathfindDeps = () => setPathfindDepsEpoch((n) => n + 1);

  /** Tracks whether the camera has been framed to the user's geo fix (no React state). */
  const globeViewStateRef = useRef({ ...DEFAULT_GLOBE_INIT });

  useLayoutEffect(() => {
    const init = applyGeoCacheFromSession();
    if (!init) return;

    isClientGeoGranted = true;
    globeViewStateRef.current = {
      lat: init.lat,
      long: init.long,
      snapInitialView: true,
    };
    setShowRecenterButton(true);
    setGlobeInit(init);
    bumpPathfindDeps();
    snapGlobeToGeoWhenReady(globeRef.current, init.lat, init.long);
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
      globeRef.current?.setMapMarkerUserLatLon(lat, lng);

      const prev = globeViewStateRef.current;
      const close =
        Math.abs(prev.lat - lat) < 0.002 && Math.abs(prev.long - lng) < 0.002;

      if (close && prev.snapInitialView) {
        globeViewStateRef.current = { lat, long: lng, snapInitialView: true };
        snapGlobeToGeoWhenReady(globeRef.current, lat, lng);
        return;
      }

      if (prev.snapInitialView && !close) {
        globeViewStateRef.current = { lat, long: lng, snapInitialView: true };
        queueMicrotask(() => {
          globeRef.current?.snapTo(lat, lng);
          globeRef.current?.snapZoomToInitTarget();
        });
        return;
      }

      globeViewStateRef.current = { lat, long: lng, snapInitialView: true };
      navigateGlobeToLatLon(
        {
          globe: globeRef.current,
          globeMovementSmooth: globeMovementSmoothRef.current,
          animationDurationMs: GlobeConsts.ANIMATE_ON_INIT_DURA,
        },
        lat,
        lng,
      );
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

      const prev = globeViewStateRef.current;
      const close =
        Math.abs(lat - prev.lat) < 0.002 && Math.abs(long - prev.long) < 0.002;

      if (prev.snapInitialView && close) {
        globeViewStateRef.current = { lat, long, snapInitialView: true };
        if (!appliedUserLocation) {
          appliedUserLocation = true;
          clearWatch();
        }
        snapGlobeToGeoWhenReady(globeRef.current, lat, long);
        return;
      }

      if (appliedUserLocation) return;
      appliedUserLocation = true;
      clearWatch();

      if (prev.snapInitialView && !close) {
        globeViewStateRef.current = { lat, long, snapInitialView: true };
        globeRef.current?.snapTo(lat, long);
        globeRef.current?.snapZoomToInitTarget();
        return;
      }

      globeViewStateRef.current = { lat, long, snapInitialView: true };

      navigateGlobeToLatLon(
        {
          globe: globeRef.current,
          globeMovementSmooth: globeMovementSmoothRef.current,
          animationDurationMs: GlobeConsts.ANIMATE_ON_INIT_DURA,
        },
        lat,
        long,
      );
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
    <SwipeMenuInteractionContext.Provider value={swipeMenuInteraction}>
    <BathroomLocalDbOnAppOpen />
    <main className="flex h-full min-h-0 flex-col">
      <UserSettingsDangerBand />
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
            cameraInitSurfaceOffsetM={cameraInitSurfaceOffsetM}
            initialSnapToGeoView={globeInit.snapInitialView}
            width={GLOBE_VIEWPORT_WIDTH}
            height={GLOBE_VIEWPORT_HEIGHT}
            zoomIndicatorRootRef={globeRootRef}
            onZoomIndicatorPulse={(x, y) => {
              setZoomIndicator((z) => ({ x, y, pulse: z.pulse + 1 }));
            }}
          />
          <BathroomViewportSync globeRef={globeRef} />
          {!addBathroomModeActive ? (
            <>
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
            </>
          ) : null}
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
        <SwipeMenuTopShadow />
        {!addBathroomModeActive && showRecenterButton ? (
          <Recenter
            globeRef={globeRef}
            viewportRef={phoneFrameRef}
            isClientGeoGranted={isClientGeoGranted}
            mapInitLat={mapInitLat}
            mapInitLong={mapInitLong}
          />
        ) : null}
        {!addBathroomModeActive ? (
          <FindNearestBathroom />
        ) : null}
        <AddBathroomMode globeRef={globeRef} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: SWIPE_MENU_BACKDROP_Z_INDEX }}
        >
          <SwipeMenuBackdrop />
        </div>
        <div className="pointer-events-none absolute inset-0 z-40">
          <MainMenu
            viewportRef={phoneFrameRef}
            onInteractionChange={setSwipeMenuInteraction}
          >
            <UserSettings />
            <RegisterNewBathroom />
          </MainMenu>
        </div>
        <UserSettingsOverlay />
      </div>
    </main>
    </SwipeMenuInteractionContext.Provider>
  );
}

export default function Home() {
  const phoneFrameRef = useRef<HTMLDivElement | null>(null);

  return (
    <AlertSystemProvider phoneViewportRef={phoneFrameRef}>
      <AddBathroomModeProvider>
        <UserSettingsProvider>
          <UserSettingsBootstrapGate>
            <HomeContent phoneFrameRef={phoneFrameRef} />
          </UserSettingsBootstrapGate>
        </UserSettingsProvider>
      </AddBathroomModeProvider>
    </AlertSystemProvider>
  );
}
