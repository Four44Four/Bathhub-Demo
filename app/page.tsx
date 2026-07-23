
"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Recenter } from "./_client/viewport2d/buttons/Recenter";
import { FindNearestBathroom } from "./_client/viewport2d/buttons/FindNearestBathroom";
import { ExitFindBathroom } from "./_client/viewport2d/buttons/ExitFindBathroom";
import { ShowSwipeUpMenu } from "./_client/viewport2d/buttons/ShowSwipeUpMenu";
import {
  GlobeViewport,
  type GlobeViewportHandle,
} from "./_client/globe/GlobeViewport";
import { CesiumAttribution } from "./_client/viewport2d/CesiumAttribution";
import { ZoomIndicator } from "./_client/viewport2d/ZoomIndicator";
import { MainMenu } from "./_client/swipeup/MainMenu";
import { SwipeMenuBackdrop } from "./_client/swipeup/SwipeMenuBackdrop";
import { SwipeMenuTopShadow } from "./_client/swipeup/SwipeMenuTopShadow";
import { SwipeMenuExpansionProvider } from "./_client/swipeup/SwipeMenuExpansion";
import {
  SwipeMenuInteractionContext,
  type SwipeMenuInteraction,
} from "./_client/swipeup/SwipeMenuInteraction";
import { SwipeUpMainMenuPage } from "./_client/swipeup/SwipeUpMainMenuPage";
import { UserSettingsProvider } from "./_client/user-settings/UserSettingsContext";
import { UserSettingsBootstrapGate } from "./_client/user-settings/UserSettingsBootstrapGate";
import { UserSettingsDangerBand } from "./_client/user-settings/UserSettingsDangerBand";
import { UserSettingsOverlay } from "./_client/user-settings/UserSettingsOverlay";
import { AlertSystemProvider } from "./_client/viewport2d/AlertSystem";
import {
  AddBathroomMode,
  AddBathroomModeProvider,
  useAddBathroomMode,
} from "./_client/viewport2d/add-bathroom-mode";
import {
  BathroomActiveNavigation,
  BathroomNavigationModeProvider,
  BathroomNavigationPreviewMode,
  useBathroomNavigationMode,
  useFindNearestBathroomFlow,
} from "./_client/viewport2d/bathroom-navigation-mode";
import { Globe as GlobeConsts, SwipeMenu as SwipeMenuConsts } from "./_client/ComponentConstants";
import { navigateGlobeToLatLon } from "./_client/pure/globe/GlobeMovementNavigation";
import {
  shouldApplyStoredGeoFixOnLoad,
  shouldDiscardStoredGeoFixOnLoad,
  readGeolocationPermissionState,
} from "./_client/pure/globe/ClientGeolocationAccess";
import {
  clientGeoPositionsClose,
  isUnsetClientGeoPosition,
} from "./_client/pure/globe/ClientGeoPosition";
import { viewport2dChromeHidden } from "./_client/pure/viewport2d/FindNearestBathroomState";
import { useUserSettings } from "./_client/user-settings/UserSettingsContext";
import { useGlobeMovementSmoothRef } from "./_client/user-settings/useGlobeMovementSmooth";
import {
  ClientGeoProvider,
  patchClientGeoRef,
  useClientGeo,
  useClientGeoRef,
  usePatchClientGeo,
} from "./_client/globe/ClientGeoContext";
import {
  UserGeolocationProvider,
  useUserGeolocation,
} from "./_client/geolocation/UserGeolocationProvider";
import { USER_SETTINGS_DEFAULTS } from "./_shared/user-settings/UserSettingsSchema";
import { BathroomViewportSync } from "./_client/bathroom/BathroomViewportSync";
import { BathroomLocalDbOnAppOpen } from "./_client/local-db";
import { SWIPE_MENU_BACKDROP_Z_INDEX } from "./_client/pure/viewport2d/PositionalAlertAnchor";

/** When set to `"100%"`, the globe mount fills the virtual phone frame (see `layout.tsx`) and the initial camera distance is chosen so the globe “covers” the view (no letterboxing; excess clips on the shorter axis). */
const GLOBE_VIEWPORT_WIDTH = "100%";
const GLOBE_VIEWPORT_HEIGHT = "100%";

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

function clearGeoCache() {
  try {
    sessionStorage.removeItem(GEO_CACHE_KEY);
  } catch {
    // ignore
  }
}

type FrozenGlobeInit = {
  lat: number;
  long: number;
  snapInitialView: boolean;
};

/** SSR-safe defaults — sessionStorage is applied after mount in `useLayoutEffect`. */
const DEFAULT_GLOBE_INIT: FrozenGlobeInit = {
  lat: 0,
  long: 0,
  snapInitialView: false,
};

function applyGeoCacheFromSession(): FrozenGlobeInit | null {
  const cached = readGeoCache();
  if (!cached) return null;
  if (isUnsetClientGeoPosition(cached.lat, cached.lng)) {
    clearGeoCache();
    return null;
  }
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
  const {
    isPreviewActive: bathroomNavigationPreviewActive,
    activeNavigation: bathroomActiveNavigation,
  } = useBathroomNavigationMode();
  const viewportChromeHidden = viewport2dChromeHidden({
    addBathroomModeActive,
    bathroomNavigationPreviewActive,
  });
  const { settings } = useUserSettings();
  const cameraInitSurfaceOffsetM =
    settings?.camera_init_surface_offset_m ??
    USER_SETTINGS_DEFAULTS.camera_init_surface_offset_m;
  const globeMovementSmoothRef = useGlobeMovementSmoothRef();
  const globeRootRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeViewportHandle | null>(null);
  const clientGeoRef = useClientGeoRef();
  const patchClientGeo = usePatchClientGeo();
  const clientGeo = useClientGeo();
  const { seedUserPosition, registerGlobeGeoHandlers } = useUserGeolocation();
  const { beginFindNearestBathroom } = useFindNearestBathroomFlow({ globeRef });
  /** SSR-safe on first render; sessionStorage geo is merged in `useLayoutEffect` before Cesium init. */
  const [globeInit, setGlobeInit] = useState<FrozenGlobeInit>(DEFAULT_GLOBE_INIT);
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

  const syncMapMarkerFallbackCoords = (lat: number, lng: number) => {
    patchClientGeoRef(clientGeoRef, { mapInitLat: lat, mapInitLong: lng }, patchClientGeo);
  };

  /** Tracks the last camera framing target for cache / snap heuristics. */
  const globeViewStateRef = useRef({ ...DEFAULT_GLOBE_INIT });
  /** Last lat/lng the globe was navigated to; allows re-framing when a bad fix is replaced. */
  const lastAppliedGlobeGeoRef = useRef<{ lat: number; lng: number } | null>(null);

  const showRecenterButton = clientGeo.isClientGeoGranted;

  const applyUserGeolocationToGlobe = (lat: number, lng: number) => {
    if (isUnsetClientGeoPosition(lat, lng)) return;

    const prevApplied = lastAppliedGlobeGeoRef.current;
    if (prevApplied && clientGeoPositionsClose(prevApplied, { lat, lng })) {
      return;
    }

    writeGeoCache(lat, lng);

    void globeRef.current?.waitForViewer().then(() => {
      const globe = globeRef.current;
      if (!globe) return;

      globe.setMapMarkerUserLatLon(lat, lng);

      const prev = globeViewStateRef.current;
      const close = clientGeoPositionsClose(
        { lat: prev.lat, lng: prev.long },
        { lat, lng },
      );

      lastAppliedGlobeGeoRef.current = { lat, lng };
      globeViewStateRef.current = { lat, long: lng, snapInitialView: true };

      if (prev.snapInitialView && close) {
        globe.snapTo(lat, lng);
        globe.snapZoomToInitTarget();
        return;
      }

      if (prev.snapInitialView && !close) {
        globe.snapTo(lat, lng);
        globe.snapZoomToInitTarget();
        return;
      }

      navigateGlobeToLatLon(
        {
          globe,
          globeMovementSmooth: globeMovementSmoothRef.current,
          animationDurationMs: GlobeConsts.ANIMATE_ON_INIT_DURA,
        },
        lat,
        lng,
      );
    });
  };

  const applyUserGeolocationToGlobeRef = useRef(applyUserGeolocationToGlobe);
  applyUserGeolocationToGlobeRef.current = applyUserGeolocationToGlobe;

  useLayoutEffect(() => {
    registerGlobeGeoHandlers({
      onUserGeoFix: (lat, lng) => {
        applyUserGeolocationToGlobeRef.current(lat, lng);
      },
      onUserGeoRevoked: () => {
        lastAppliedGlobeGeoRef.current = null;
        globeViewStateRef.current = { ...DEFAULT_GLOBE_INIT };
      },
    });
    return () => registerGlobeGeoHandlers(null);
  }, [registerGlobeGeoHandlers]);

  useLayoutEffect(() => {
    const init = applyGeoCacheFromSession();
    if (!init) return;

    let cancelled = false;

    const applyCachedGeo = () => {
      if (cancelled) return;
      globeViewStateRef.current = init;
      lastAppliedGlobeGeoRef.current = { lat: init.lat, lng: init.long };
      setGlobeInit(init);
      seedUserPosition({ latitude: init.lat, longitude: init.long });
      patchClientGeo({
        isClientGeoGranted: true,
        mapInitLat: init.lat,
        mapInitLong: init.long,
      });
      snapGlobeToGeoWhenReady(globeRef.current, init.lat, init.long);
    };

    void readGeolocationPermissionState().then((permissionState) => {
      if (cancelled) return;
      if (shouldDiscardStoredGeoFixOnLoad(permissionState)) {
        clearGeoCache();
        return;
      }
      if (shouldApplyStoredGeoFixOnLoad(permissionState)) {
        applyCachedGeo();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [patchClientGeo, seedUserPosition]);

  return (
    <SwipeMenuExpansionProvider>
    <SwipeMenuInteractionContext.Provider value={swipeMenuInteraction}>
    <BathroomLocalDbOnAppOpen />
    <main className="flex h-full min-h-0 flex-col">
      <div ref={phoneFrameRef} className="relative flex min-h-0 flex-1 flex-col">
        <UserSettingsDangerBand />
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
            onMapMarkerUserLatLonChange={syncMapMarkerFallbackCoords}
          />
          <BathroomViewportSync globeRef={globeRef} />
          {!viewportChromeHidden ? (
            <>
              <ZoomIndicator
                x={zoomIndicator.x}
                y={zoomIndicator.y}
                pulse={zoomIndicator.pulse}
                hidden={zoomIndicator.pulse === 0}
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
        {!viewportChromeHidden ? <ShowSwipeUpMenu /> : null}
        {!viewportChromeHidden && showRecenterButton ? (
          <Recenter
            globeRef={globeRef}
            viewportRef={phoneFrameRef}
            isClientGeoGranted={clientGeo.isClientGeoGranted}
            mapInitLat={clientGeo.mapInitLat}
            mapInitLong={clientGeo.mapInitLong}
          />
        ) : null}
        {!viewportChromeHidden && showRecenterButton && bathroomActiveNavigation === null ? (
          <FindNearestBathroom onClick={beginFindNearestBathroom} />
        ) : null}
        {!viewportChromeHidden && showRecenterButton && bathroomActiveNavigation !== null ? (
          <ExitFindBathroom />
        ) : null}
        <BathroomNavigationPreviewMode globeRef={globeRef} />
        <BathroomActiveNavigation globeRef={globeRef} />
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
            <SwipeUpMainMenuPage />
          </MainMenu>
        </div>
        <UserSettingsOverlay />
      </div>
    </main>
    </SwipeMenuInteractionContext.Provider>
    </SwipeMenuExpansionProvider>
  );
}

export default function Home() {
  const phoneFrameRef = useRef<HTMLDivElement | null>(null);

  return (
    <AlertSystemProvider phoneViewportRef={phoneFrameRef}>
      <AddBathroomModeProvider>
        <BathroomNavigationModeProvider>
          <ClientGeoProvider>
            <UserGeolocationProvider>
              <UserSettingsProvider>
              <UserSettingsBootstrapGate>
                <HomeContent phoneFrameRef={phoneFrameRef} />
              </UserSettingsBootstrapGate>
              </UserSettingsProvider>
            </UserGeolocationProvider>
          </ClientGeoProvider>
        </BathroomNavigationModeProvider>
      </AddBathroomModeProvider>
    </AlertSystemProvider>
  );
}
