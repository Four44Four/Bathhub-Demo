"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from "react";
import type * as CesiumTypes from "cesium";

import { Globe as GlobeConsts, MapMarker as MapMarkerConsts, NearestBathroom as NearestBathroomConsts } from "../ComponentConstants";
import { loadCesium } from "./loadCesium";
import * as Utils from "../Utils";
import * as ServerDebug from "../../_server/Debug";
import { type Point } from "../../_shared/Utils";
import { type ViewportBounds } from "../../_shared/BathroomDataPrimary";
import { installClickedIndicator } from "./ClickedIndicator";
import { installDebugCrosshair } from "./DebugCrosshair";
import { installMapMarker } from "./MapMarker";
import { installPath, type PathHandle } from "./Path";
import { installOrbitCameraControls, type InstalledOrbitCameraControls } from "./Camera";
import { globeLodVisualStateFromCameraHeightM } from "../pure/globe/GlobeLayerLod";
import { TwoToneTileProcessor } from "./TwoToneTileProcessor";
import { dimensionCss } from "../pure/globe/GlobeViewportCss";
import { shouldNotifyCameraMotionIdleOnSamplerSettled } from "../pure/globe/GlobeViewportCameraMotionIdle";
import { viewportCenterBusySamplingArmAction } from "../pure/globe/GlobeViewportCenterSampling";
import { shouldSchedulePathLodRebuildOnIdle } from "../pure/globe/PathLodRebuildPolicy";
import * as GeoArrival from "../pure/globe/GeoArrivalCameraLock";
import {
  computeViewportBoundsLatLon,
  pickViewportSurfaceLatLon,
  type ViewportSurfacePickDeps,
} from "../pure/globe/ViewportSurfacePick";
import { useSwipeMenuBlocksViewport } from "../swipeup/SwipeMenuInteraction";

/** Set to true once `VIEWPORT_DETECT_IDLE_MS` elapses without mouse or pointer input; cleared when input resumes. */
let isClientIdle = false;

type ViewportChangeListener = () => void;
const viewportChangeListeners = new Set<ViewportChangeListener>();

function notifyViewportChangeListeners(): void {
  for (const listener of viewportChangeListeners) {
    listener();
  }
}

type CameraMotionIdleListener = () => void;
const cameraMotionIdleListeners = new Set<CameraMotionIdleListener>();

function notifyCameraMotionIdleListeners(): void {
  for (const listener of cameraMotionIdleListeners) {
    listener();
  }
}

function buildViewportSurfacePickDeps(
  viewer: CesiumTypes.Viewer,
  Cesium: typeof import("cesium"),
): ViewportSurfacePickDeps {
  const canvas = viewer.scene.canvas;
  const ellipsoid = viewer.scene.globe.ellipsoid;

  return {
    canvasWidth: canvas.clientWidth,
    canvasHeight: canvas.clientHeight,
    pickPositionSupported: viewer.scene.pickPositionSupported,
    pickPosition: (x, y) => {
      try {
        return viewer.scene.pickPosition(new Cesium.Cartesian2(x, y));
      } catch {
        return undefined;
      }
    },
    getPickRay: (x, y) => {
      try {
        return viewer.camera.getPickRay(new Cesium.Cartesian2(x, y));
      } catch {
        return null;
      }
    },
    globePick: (ray) => {
      try {
        return viewer.scene.globe.pick(ray as CesiumTypes.Ray, viewer.scene);
      } catch {
        return undefined;
      }
    },
    pickEllipsoid: (x, y) => {
      try {
        return viewer.camera.pickEllipsoid(
          new Cesium.Cartesian2(x, y),
          ellipsoid,
        );
      } catch {
        return null;
      }
    },
    cartographicFromCartesian: (cartesian) => {
      try {
        return Cesium.Cartographic.fromCartesian(
          cartesian as CesiumTypes.Cartesian3,
          ellipsoid,
        );
      } catch {
        return undefined;
      }
    },
    toDegrees: (radians) => Cesium.Math.toDegrees(radians),
  };
}

function computeViewportCenterLatLon(
  viewer: CesiumTypes.Viewer,
  Cesium: typeof import("cesium"),
): Point | null {
  const deps = buildViewportSurfacePickDeps(viewer, Cesium);
  const centerX = deps.canvasWidth / 2;
  const centerY = deps.canvasHeight / 2;
  return pickViewportSurfaceLatLon(deps, centerX, centerY);
}

function computeViewportBoundsFromViewer(
  viewer: CesiumTypes.Viewer,
  Cesium: typeof import("cesium"),
): ViewportBounds | null {
  return computeViewportBoundsLatLon(buildViewportSurfacePickDeps(viewer, Cesium));
}

/**
 * Imperative handle exposed via the `ref` prop so callers can drive the camera
 * without forcing a re-init of the underlying Cesium viewer. Currently used by
 * `Home()` to smoothly rotate to the user's geolocation when permission is
 * granted *after* first render.
 */
export type GlobeViewportHandle = {
  animateTo: (lat: number, long: number, durationMs?: number) => void;
  animateZoomToInitTarget: (durationMs?: number) => void;
  snapZoomToInitTarget: () => void;
  animateZoomToCameraHeightM: (heightM: number, durationMs?: number) => void;
  snapZoomToCameraHeightM: (heightM: number) => void;
  /** Orbit camera center distance in meters (matches interactive zoom level). */
  getOrbitCenterDistanceM: () => number;
  animateZoomToOrbitCenterDistanceM: (
    centerDistanceM: number,
    durationMs?: number,
  ) => void;
  snapZoomToOrbitCenterDistanceM: (centerDistanceM: number) => void;
  /** Immediately centers the globe on (lat, long) without rotation animation. */
  snapTo: (lat: number, long: number) => void;
  /** Lat/long where the map surface lies under the viewport center (camera look target). */
  getViewportCenterLatLon: () => Point | null;
  /** Geographic bounding box of the visible globe surface in the viewport. */
  getViewportBoundsLatLon: () => ViewportBounds | null;
  /** Camera height in meters above the WGS84 ellipsoid. */
  getCameraHeightM: () => number;
  /** Subscribe to viewport bounds / camera updates (returns an unsubscribe function). */
  subscribeViewportChanges: (listener: ViewportChangeListener) => () => void;
  /** Resolves once the underlying Cesium viewer is ready. */
  waitForViewer: () => Promise<CesiumTypes.Viewer>;
  /** Re-samples viewport bounds/camera and notifies subscribers immediately. */
  requestViewportResync: () => void;
  /** True while drag, pinch, wheel smoothing, or programmatic camera animation is active. */
  isGlobeViewportSamplerBusy: () => boolean;
  /**
   * Fired when programmatic or interactive camera motion has fully settled
   * (no active sampler-busy animation or gesture).
   */
  subscribeCameraMotionIdle: (listener: CameraMotionIdleListener) => () => void;
  /**
   * Authoritative "you are here" push from `page.tsx`'s geolocation watcher.
   * Immediately flips MapMarker from the 2D static overlay to the 3D billboard
   * at (lat, long). Survives Cesium viewer re-inits (the last pushed value is
   * replayed when a new MapMarker is installed). Call this BEFORE `animateTo` /
   * `animateZoomToInitTarget` so the switch is visible from the first animation frame.
   */
  setMapMarkerUserLatLon: (lat: number, long: number) => void;
  /**
   * Latest device position from MapMarker's continuous geolocation watch (or the
   * last `setMapMarkerUserLatLon` push). Null before the first fix.
   */
  getMapMarkerUserLatLon: () => Point | null;
  /**
   * Call immediately before `animateTo` + `animateZoomToInitTarget` for the post-permission
   * geolocation sequence. Orbit pointer/wheel/pinch stays disabled for exactly
   * {@link GlobeConsts.ANIMATE_ON_INIT_DURA} ms (same as init animations).
   */
  beginGeoArrivalInteractionLock: () => void;
  /** Renders a path on the globe (see `Path.ts` for styling). */
  setPathFromLatLonPoints: (points: Point[]) => void;
  clearPath: () => void;
};

/**
 * Start position for pathfinding / recenter flows:
 *
 * Current client geolocation coordinates when permitted; otherwise the surface point under the
 * viewport center, or fallback to map init coordinates if Cesium is not ready.
 *
 * With geolocation granted, coordinates come from MapMarker's continuous watch (via
 * `getMapMarkerUserLatLon`), falling back to `mapInitLat` / `mapInitLong` before the
 * first fix.
 */
export function getStartPos(
  globe: GlobeViewportHandle | null,
  isClientGeoGranted: boolean,
  mapInitLat: number,
  mapInitLong: number,
): Point {
  if (!isClientGeoGranted) {
    return (
      globe?.getViewportCenterLatLon() ?? {
        latitude: mapInitLat,
        longitude: mapInitLong,
      }
    );
  }

  const liveUser = globe?.getMapMarkerUserLatLon();
  if (liveUser) {
    return liveUser;
  }

  return {
    latitude: mapInitLat,
    longitude: mapInitLong,
  };
}

type GlobeViewportProps = {
  initLat: number;
  initLong: number;
  /** Meters above the globe surface for the post-geolocation init zoom target. */
  cameraInitSurfaceOffsetM: number;
  /**
   * When true, the camera starts at the post-geolocation zoom distance immediately (no fly-in
   * from the default whole-globe framing used for full-width layouts).
   */
  initialSnapToGeoView?: boolean;
  width: number | string;
  height: number | string;
  /**
   * Optional ref to the element that `ZoomIndicator` will be positioned relative to.
   * If omitted, pulses are computed relative to the internal container.
   */
  zoomIndicatorRootRef?: RefObject<HTMLElement | null>;
  /**
   * Called when a zoom-in gesture occurs; coordinates are CSS pixels relative to `zoomIndicatorRootRef` (or the internal container).
   */
  onZoomIndicatorPulse?: (x: number, y: number) => void;
  /**
   * Called when MapMarker receives a new device position (watch or push). Used to keep
   * client geo fallback coordinates current without relying on React re-renders.
   */
  onMapMarkerUserLatLonChange?: (latitude: number, longitude: number) => void;
  /**
   * React 19 ref-as-prop. Receives a `GlobeViewportHandle` once the Cesium
   * viewer has finished initializing.
   */
  ref?: Ref<GlobeViewportHandle | null>;
};

export function GlobeViewport({
  initLat,
  initLong,
  cameraInitSurfaceOffsetM,
  initialSnapToGeoView = false,
  width,
  height,
  zoomIndicatorRootRef,
  onZoomIndicatorPulse,
  onMapMarkerUserLatLonChange,
  ref,
}: GlobeViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blocksViewportPointer = useSwipeMenuBlocksViewport();
  const blocksViewportPointerRef = useRef(blocksViewportPointer);
  blocksViewportPointerRef.current = blocksViewportPointer;
  /** Latest mount props; read when async Cesium init runs (parent may update before first effect). */
  const mountInitPropsRef = useRef({
    initLat,
    initLong,
    cameraInitSurfaceOffsetM,
    initialSnapToGeoView,
  });
  mountInitPropsRef.current = {
    initLat,
    initLong,
    cameraInitSurfaceOffsetM,
    initialSnapToGeoView,
  };
  // The orbit camera controls are created inside an async init() below; until
  // they exist, queue the most recent `animateTo` request and replay it once
  // the viewer is ready.
  const cameraControlsRef = useRef<InstalledOrbitCameraControls | null>(null);
  const pendingAnimateToRef = useRef<{ lat: number; long: number; durationMs?: number } | null>(null);
  const pendingZoomToInitRef = useRef<{ durationMs?: number; snap?: boolean } | null>(null);
  const pendingZoomToHeightRef = useRef<
    { heightM: number; durationMs?: number; snap?: boolean } | null
  >(null);
  const pendingZoomToOrbitRef = useRef<
    { centerDistanceM: number; durationMs?: number; snap?: boolean } | null
  >(null);
  const pendingSnapToRef = useRef<{ lat: number; long: number } | null>(null);
  const viewerRef = useRef<CesiumTypes.Viewer | null>(null);
  const cesiumNsRef = useRef<typeof import("cesium") | null>(null);
  const pathHandleRef = useRef<PathHandle | null>(null);
  /** Shared cache for `getViewportCenterLatLon`, MapMarker viewport-follow mode, and callers like `getStartPos`. */
  const viewportCenterLatLonRef = useRef<Point | null>(null);
  const viewportBoundsLatLonRef = useRef<ViewportBounds | null>(null);
  const cameraHeightMRef = useRef<number>(Number.POSITIVE_INFINITY);
  const viewerReadyResolversRef = useRef<Array<(viewer: CesiumTypes.Viewer) => void>>(
    [],
  );
  const requestViewportResyncRef = useRef<(() => void) | null>(null);
  /** Arms repeated viewport-center sampling while the user rotates or zooms. */
  const ensureBusySamplingRef = useRef<(() => void) | null>(null);
  /** Restarts the pointer-idle countdown after mouse/pointer/wheel input. */
  const armIdleDetectionRef = useRef<(() => void) | null>(null);
  const [mapMarkerStaticOverlay, setMapMarkerStaticOverlay] = useState(true);
  /**
   * Live MapMarker handle (replaced when the viewer reinits). The imperative
   * `setMapMarkerUserLatLon` reads this so callers don't have to know about reinits.
   */
  const mapMarkerRef = useRef<ReturnType<typeof installMapMarker> | null>(null);
  /**
   * Last user lat/long pushed via `setMapMarkerUserLatLon`. Replayed into newly
   * installed MapMarkers (e.g., after a Cesium viewer rebuild caused by an
   * `initLat/initLong` change) so the billboard doesn't fall back to the 2D overlay.
   */
  const userGeoLatLonRef = useRef<Point | null>(null);
  const geoArrivalLockStateRef = useRef(GeoArrival.initialGeoArrivalLockState());
  const pathLodStateRef = useRef({
    lastRebuiltOrbitCenterDistanceM: null as number | null,
    debounceTimerId: null as number | null,
    pendingRebuildAfterMotion: false,
  });

  useEffect(() => {
    cameraControlsRef.current?.setCameraInitSurfaceOffsetM(cameraInitSurfaceOffsetM);
  }, [cameraInitSurfaceOffsetM]);

  useImperativeHandle<GlobeViewportHandle | null, GlobeViewportHandle>(
    ref,
    () => ({
      animateTo: (lat, long, durationMs) => {
        const controls = cameraControlsRef.current;
        if (controls) {
          controls.animateTo(lat, long, durationMs);
        } else {
          pendingAnimateToRef.current = { lat, long, durationMs };
        }
      },
      animateZoomToInitTarget: (durationMs) => {
        const controls = cameraControlsRef.current;
        if (controls) {
          controls.animateZoomToInitTarget(durationMs);
        } else {
          pendingZoomToInitRef.current = { durationMs, snap: false };
        }
      },
      snapZoomToInitTarget: () => {
        const controls = cameraControlsRef.current;
        if (controls) {
          controls.snapZoomToInitTarget();
        } else {
          pendingZoomToInitRef.current = { snap: true };
        }
      },
      animateZoomToCameraHeightM: (heightM, durationMs) => {
        const controls = cameraControlsRef.current;
        if (controls) {
          controls.animateZoomToCameraHeightM(heightM, durationMs);
        } else {
          pendingZoomToHeightRef.current = { heightM, durationMs, snap: false };
        }
      },
      snapZoomToCameraHeightM: (heightM) => {
        const controls = cameraControlsRef.current;
        if (controls) {
          controls.snapZoomToCameraHeightM(heightM);
        } else {
          pendingZoomToHeightRef.current = { heightM, snap: true };
        }
      },
      getOrbitCenterDistanceM: () =>
        cameraControlsRef.current?.getOrbitCenterDistanceM() ??
        Number.POSITIVE_INFINITY,
      animateZoomToOrbitCenterDistanceM: (centerDistanceM, durationMs) => {
        const controls = cameraControlsRef.current;
        if (controls) {
          controls.animateZoomToOrbitCenterDistanceM(centerDistanceM, durationMs);
        } else {
          pendingZoomToOrbitRef.current = { centerDistanceM, durationMs, snap: false };
        }
      },
      snapZoomToOrbitCenterDistanceM: (centerDistanceM) => {
        const controls = cameraControlsRef.current;
        if (controls) {
          controls.snapZoomToOrbitCenterDistanceM(centerDistanceM);
        } else {
          pendingZoomToOrbitRef.current = { centerDistanceM, snap: true };
        }
      },
      snapTo: (lat, long) => {
        const controls = cameraControlsRef.current;
        if (controls) {
          controls.snapTo(lat, long);
        } else {
          pendingSnapToRef.current = { lat, long };
        }
      },
      getViewportCenterLatLon: () => viewportCenterLatLonRef.current,
      getViewportBoundsLatLon: () => viewportBoundsLatLonRef.current,
      getCameraHeightM: () => cameraHeightMRef.current,
      subscribeViewportChanges: (listener) => {
        viewportChangeListeners.add(listener);
        return () => {
          viewportChangeListeners.delete(listener);
        };
      },
      waitForViewer: () =>
        new Promise((resolve) => {
          const existing = viewerRef.current;
          if (existing) {
            resolve(existing);
            return;
          }
          viewerReadyResolversRef.current.push(resolve);
        }),
      requestViewportResync: () => {
        requestViewportResyncRef.current?.();
      },
      isGlobeViewportSamplerBusy: () =>
        cameraControlsRef.current?.isGlobeViewportSamplerBusy() ?? false,
      subscribeCameraMotionIdle: (listener) => {
        cameraMotionIdleListeners.add(listener);
        return () => {
          cameraMotionIdleListeners.delete(listener);
        };
      },
      setMapMarkerUserLatLon: (lat, long) => {
        userGeoLatLonRef.current = { latitude: lat, longitude: long };
        // If MapMarker isn't installed yet, the value lives in the ref and is
        // applied via `initialUserLatLonDegrees` on the next install.
        mapMarkerRef.current?.setUserLatLonDegrees(lat, long);
      },
      getMapMarkerUserLatLon: () => userGeoLatLonRef.current,
      beginGeoArrivalInteractionLock: () => {
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        geoArrivalLockStateRef.current = GeoArrival.beginGeoArrivalLock(
          geoArrivalLockStateRef.current,
          now,
          GlobeConsts.ANIMATE_ON_INIT_DURA,
        );
      },
      setPathFromLatLonPoints: (points) => {
        pathHandleRef.current?.setPath(points);
        pathLodStateRef.current.lastRebuiltOrbitCenterDistanceM =
          cameraControlsRef.current?.getOrbitCenterDistanceM() ??
          Number.POSITIVE_INFINITY;
        if (cameraControlsRef.current?.isGlobeViewportSamplerBusy()) {
          pathLodStateRef.current.pendingRebuildAfterMotion = true;
        }
      },
      clearPath: () => {
        pathHandleRef.current?.clearPath();
        pathLodStateRef.current.lastRebuiltOrbitCenterDistanceM = null;
        pathLodStateRef.current.pendingRebuildAfterMotion = false;
        if (pathLodStateRef.current.debounceTimerId !== null) {
          window.clearTimeout(pathLodStateRef.current.debounceTimerId);
          pathLodStateRef.current.debounceTimerId = null;
        }
      },
    }),
    [],
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Clear any previous content (e.g. from an earlier init).
    mount.textContent = "";

    let viewer: CesiumTypes.Viewer | null = null;
    let cancelled = false;

    const init = async () => {
      const Cesium = await loadCesium();
      cesiumNsRef.current = Cesium;

      if (cancelled) return;

      // In Next/app layouts the mount can momentarily be 0x0; initializing Cesium then
      // can result in a blank globe until the first manual resize. Wait briefly until
      // we have a real size.
      for (let i = 0; i < 60; i++) {
        if (cancelled) return;
        if (mount.clientWidth > 2 && mount.clientHeight > 2) break;
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      }

      const tileProcessor = new TwoToneTileProcessor(
        Utils.hexToRgb(GlobeConsts.WATER_COLOR),
        Utils.hexToRgb(GlobeConsts.LAND_COLOR),
      );

      // Create a custom provider that recolors tiles into the requested two solid colors.
      class SolidColorImageryProvider extends Cesium.UrlTemplateImageryProvider {
        requestImage(
          x: number,
          y: number,
          level: number,
          request?: CesiumTypes.Request,
        ): Promise<CesiumTypes.ImageryTypes> | undefined {
          // Cesium's contract: `super.requestImage` returns `undefined`
          // synchronously when the request was deferred by RequestScheduler.
          // We must propagate that `undefined` (not wrap it in a resolved
          // Promise) so Cesium will retry later instead of locking the tile
          // forever. Returning a solid-color placeholder here was the cause
          // of "dark purple chunks that never load" at zoomed-out views.
          const basePromise = super.requestImage(x, y, level, request);
          if (!basePromise) return undefined;

          return basePromise.then(async (baseImage) => {
            const img = baseImage as unknown as ImageBitmap | HTMLImageElement;
            try {
              const recolored = await tileProcessor.recolor(img);
              return recolored as CesiumTypes.ImageryTypes;
            } catch {
              // If pixel readback fails (CORS taint, OOM, etc), fall through to
              // the un-recolored tile rather than to a purple placeholder.
            }
            return baseImage;
          });
        }
      }

      // Use a true sphere so the globe is perfectly round (uniform radius).
      const sphereRadius = Cesium.Ellipsoid.WGS84.maximumRadius;
      const ellipsoid = new Cesium.Ellipsoid(sphereRadius, sphereRadius, sphereRadius);
      const globe = new Cesium.Globe(ellipsoid);
      viewer = new Cesium.Viewer(mount, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        baseLayer: false,
        globe,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        vrButton: false,
        selectionIndicator: false,
        scene3DOnly: true,
        shouldAnimate: false,
        shadows: false,
        // Start with no imagery; we add our recolored Google-tile layer next.
      });
      viewerRef.current = viewer;
      const readyResolvers = viewerReadyResolversRef.current.splice(0);
      for (const resolve of readyResolvers) {
        resolve(viewer);
      }
      viewer.resize();
      viewer.forceResize?.();

      // Hide Cesium credit text (requested). Note: this may violate attribution requirements.
      try {
        const creditContainer = (
          viewer as unknown as { _cesiumWidget?: { _creditContainer?: HTMLElement } }
        )._cesiumWidget?._creditContainer;
        if (creditContainer?.style) {
          creditContainer.style.display = "none";
        }
      } catch {
        // TODO: send dev notification via API if Cesium internals change
      }

      // Make attribution/credits smaller + top-left (still visible for compliance).
      try {
        const creditEl = viewer.cesiumWidget.creditContainer as HTMLDivElement | undefined;
        if (creditEl) {
          creditEl.style.position = "absolute";
          creditEl.style.left = "10px";
          creditEl.style.top = "10px";
          creditEl.style.right = "auto";
          creditEl.style.bottom = "auto";
          creditEl.style.margin = "0";
          creditEl.style.padding = "1px 2px";
          creditEl.style.borderRadius = "0";
          // Equivalent of:
          // .cesium-viewer .cesium-widget-credits { font-size: 10px; line-height: 10px; }
          creditEl.style.fontSize = "10px";
          creditEl.style.lineHeight = "10px";
          creditEl.style.opacity = "0.75";
          creditEl.style.maxWidth = "80%";
          creditEl.style.zIndex = "10";
          creditEl.style.background = "transparent";
          creditEl.style.backdropFilter = "";
          creditEl.style.userSelect = "none";
          // Safari/iOS
          (creditEl.style as unknown as { webkitUserSelect?: string; webkitTouchCallout?: string }).webkitUserSelect =
            "none";
          (creditEl.style as unknown as { webkitUserSelect?: string; webkitTouchCallout?: string }).webkitTouchCallout =
            "none";

          // Cesium's default CSS can enforce a bottom position; clear it.
          creditEl.classList.add("bh-credit-override");

          // Equivalent of:
          // .cesium-viewer .cesium-widget-credits img { height: 12px; }
          const imgs = creditEl.querySelectorAll("img");
          imgs.forEach((img) => {
            (img as HTMLImageElement).style.height = "12px";
            (img as HTMLImageElement).style.width = "auto";
          });
        }
      } catch {
        // Ignore styling failures; credits will remain in default position.
      }

      // Reduce GPU usage: render only when needed, and throttle periodic renders.
      // When enabled, Cesium will render on interaction/changes (we also call requestRender explicitly).
      viewer.scene.requestRenderMode = true;
      // Maximum time delta (seconds) before Cesium renders again due to time changes.
      // Smaller => more frequent renders. Larger => fewer background renders.
      viewer.scene.maximumRenderTimeChange = 1 / 15; // ~15 FPS max for "background" updates

      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString(GlobeConsts.WATER_COLOR);
      // Render crisply on high-DPI displays (avoid blurry labels when zoomed in).
      // Cap to avoid runaway GPU cost on very high-DPI monitors.
      viewer.resolutionScale = Math.min(3, window.devicePixelRatio || 1);

      // Favor loading higher-zoom tiles when close.
      viewer.scene.globe.preloadAncestors = true;
      viewer.scene.globe.preloadSiblings = true;

      // Keep a generously-sized tile cache so tiles aren't evicted between
      // camera changes; the default (~100) is small enough that on a wide
      // zoomed-out view, tiles can be evicted and then re-fetched, which
      // shows up as briefly-purple chunks while reloading.
      (viewer.scene.globe as unknown as { tileCacheSize?: number }).tileCacheSize = 1000;

      // Firefox-specific extra: some GPU/driver combos cull aggressively at the horizon.
      const isFirefox =
        typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent) && !/seamonkey/i.test(navigator.userAgent);
      if (isFirefox) {
        (viewer.scene.globe as unknown as { tileCacheSize?: number }).tileCacheSize = 2000;
        (viewer.scene.globe as unknown as { backFaceCulling?: boolean }).backFaceCulling = false;
      }

      // Recolor imagery tiles to the required palette.
      // Use OpenStreetMap standard tile server. Respect their usage policy if you deploy this.
      // Docs: https://operations.osmfoundation.org/policies/tiles/
      const url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      // Base layer covers the full globe at all zoom levels. Cap is intentionally
      // generous so the base never looks chunkier than the detail layer that fades in.
      // Level 9 tiles are ~78km wide at the equator; combined with the detail-layer
      // fade-in below, no large pixelated chunks should be visible at any zoom.
      const provider = new SolidColorImageryProvider({
        url,
        subdomains: ["a", "b", "c"],
        credit: "© OpenStreetMap contributors",
        minimumLevel: 0,
        maximumLevel: 9,
        tileWidth: 256,
        tileHeight: 256,
      });

      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(provider);

      const clickedIndicator = installClickedIndicator(Cesium, viewer);

      const pathHandle = installPath(Cesium, viewer, ellipsoid);
      pathHandleRef.current = pathHandle;

      const cancelPathLodDebounce = () => {
        if (pathLodStateRef.current.debounceTimerId !== null) {
          window.clearTimeout(pathLodStateRef.current.debounceTimerId);
          pathLodStateRef.current.debounceTimerId = null;
        }
      };

      const readPathLodOrbitCenterDistanceM = () =>
        cameraControls.getOrbitCenterDistanceM();

      const runPathLodRebuildNow = () => {
        if (cancelled || !viewer) return;
        cancelPathLodDebounce();
        pathHandle.rebuildActivePath();
        pathLodStateRef.current.lastRebuiltOrbitCenterDistanceM =
          readPathLodOrbitCenterDistanceM();
      };

      const schedulePathLodRebuildDebounced = () => {
        if (cancelled || !viewer) return;
        cancelPathLodDebounce();
        pathLodStateRef.current.debounceTimerId = window.setTimeout(() => {
          pathLodStateRef.current.debounceTimerId = null;
          runPathLodRebuildNow();
        }, NearestBathroomConsts.PATH_REBUILD_LOD_GEOM_DEBOUNCE_MS);
      };

      const runPendingPathLodRebuildAfterMotion = () => {
        if (!pathLodStateRef.current.pendingRebuildAfterMotion) return;
        pathLodStateRef.current.pendingRebuildAfterMotion = false;
        if (
          !shouldSchedulePathLodRebuildOnIdle({
            currentOrbitCenterDistanceM: readPathLodOrbitCenterDistanceM(),
            lastRebuiltOrbitCenterDistanceM:
              pathLodStateRef.current.lastRebuiltOrbitCenterDistanceM,
          })
        ) {
          return;
        }
        runPathLodRebuildNow();
      };

      const maybeSchedulePathLodRebuildOnClientIdle = () => {
        if (cancelled || !viewer) return;
        if (
          !shouldSchedulePathLodRebuildOnIdle({
            currentOrbitCenterDistanceM: readPathLodOrbitCenterDistanceM(),
            lastRebuiltOrbitCenterDistanceM:
              pathLodStateRef.current.lastRebuiltOrbitCenterDistanceM,
          })
        ) {
          return;
        }
        schedulePathLodRebuildDebounced();
      };

      // Ensure Cesium never handles double-click / double-tap camera actions.
      // We keep our own pointer-based interaction, but remove the default input actions
      // that can "zoom/teleport" on rapid double clicks.
      try {
        viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      } catch {
        // If Cesium internals change, the canvas dblclick preventDefault still applies.
      }

      // High-zoom detail overlay (streets/buildings + names) that only fades in when close.
      // This is still 2D raster imagery (no 3D tiles/models).
      const detailProvider = new SolidColorImageryProvider({
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        subdomains: ["a", "b", "c", "d"],
        credit: "© OpenStreetMap contributors, © CARTO",
        minimumLevel: 0,
        maximumLevel: 20,
      });
      const detailLayer = viewer.imageryLayers.addImageryProvider(detailProvider);
      detailLayer.alpha = 0.0;
      // Keep hidden until alpha rises above zero. Cesium still issues tile
      // requests for `show=true` layers even at alpha=0, which steals network
      // bandwidth from the visible base layer (and can trigger OSM rate-limits
      // that show up as missing dark-purple chunks).
      detailLayer.show = false;

      // Ultra-close "street view": max zoom OSM tiles for precise building/road/label placement.
      // Faded in only when the camera is very close to the surface.
      const streetProvider = new SolidColorImageryProvider({
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        subdomains: ["a", "b", "c"],
        credit: "© OpenStreetMap contributors",
        minimumLevel: 0,
        maximumLevel: 20,
      });
      const streetLayer = viewer.imageryLayers.addImageryProvider(streetProvider);
      streetLayer.alpha = 0.0;
      // Same rationale as the detail layer: don't fetch street-zoom tiles
      // (max level 20) while invisible at far distances.
      streetLayer.show = false;

      // Center the camera on the requested init lat/long.
      const radius = ellipsoid.maximumRadius;
      const viewportSamplerWakeRef: { ensureBusy?: () => void } = {};
      const viewportSamplerIdleCallbacks: { armIdleDetection?: () => void } = {};
      const cameraMotionSettledRef: { run?: () => void } = {};
      const tickGeoArrivalLock = () => {
        const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
        geoArrivalLockStateRef.current = GeoArrival.reduceGeoArrivalLockForTick(
          geoArrivalLockStateRef.current,
          nowMs,
        );
      };
      const {
        initLat: mountInitLat,
        initLong: mountInitLong,
        cameraInitSurfaceOffsetM: mountCameraInitSurfaceOffsetM,
        initialSnapToGeoView: mountInitialSnapToGeoView,
      } = mountInitPropsRef.current;

      const cameraControls = installOrbitCameraControls({
        Cesium,
        viewer,
        ellipsoid,
        radius,
        initLat: mountInitLat,
        initLong: mountInitLong,
        width,
        cameraInitSurfaceOffsetM: mountCameraInitSurfaceOffsetM,
        startAtInitTargetRange: mountInitialSnapToGeoView,
        containerRef,
        zoomIndicatorRootRef,
        onZoomIndicatorPulse,
        onGlobeViewportInteraction: (phase) => {
          isClientIdle = false;
          if (phase === "start") {
            cancelPathLodDebounce();
            pointerIdleNotified = false;
          }
          viewportSamplerIdleCallbacks.armIdleDetection?.();
          viewportSamplerWakeRef.ensureBusy?.();
        },
        onClickLatLonDegrees: (lat, lon) => {
          const logString = `Lat: ${lat}, Lon: ${lon}`;
          ServerDebug.log(logString);
          console.log(logString);
          clickedIndicator.setLatLonDegrees(lat, lon);
        },
        isUserGlobeOrbitInputAllowed: () => {
          if (blocksViewportPointerRef.current) return false;
          tickGeoArrivalLock();
          return GeoArrival.isGlobeOrbitUserInputAllowed(geoArrivalLockStateRef.current);
        },
        onCameraMotionSettled: () => {
          cameraMotionSettledRef.run?.();
        },
        onWheelZoomFrame: () => {
          viewportSamplerWakeRef.ensureBusy?.();
        },
      });

      // Publish the controls for the imperative handle (pending animations replayed below).
      cameraControlsRef.current = cameraControls;

      const mapMarker = installMapMarker(
        Cesium,
        viewer,
        () => viewportCenterLatLonRef.current,
        setMapMarkerStaticOverlay,
        {
          initialUserLatLonDegrees: userGeoLatLonRef.current,
          onUserLatLonChange: (lat, lon) => {
            userGeoLatLonRef.current = { latitude: lat, longitude: lon };
            onMapMarkerUserLatLonChange?.(lat, lon);
          },
        },
      );
      mapMarkerRef.current = mapMarker;
      const debugCrosshair = installDebugCrosshair(Cesium, viewer, () => viewportCenterLatLonRef.current);

      isClientIdle = false;

      let viewportSamplerTimer: number | null = null;
      let idleDetectTimer: number | null = null;
      let busySamplingActive = false;
      /** True after pointer-idle subscribers were notified for the current input session. */
      let pointerIdleNotified = false;

      const shouldNotifyMotionIdleOnSamplerSettled = () =>
        shouldNotifyCameraMotionIdleOnSamplerSettled({
          pointerIdle: cameraControls.isGlobeViewportPointerIdle(
            GlobeConsts.VIEWPORT_DETECT_IDLE_MS,
          ),
          wheelZoomFromUserInput: cameraControls.isWheelZoomFromUserInput(),
          pointerIdleAlreadyNotified: pointerIdleNotified,
        });

      const notifyCameraMotionIdleIfNeeded = () => {
        if (!shouldNotifyMotionIdleOnSamplerSettled()) return;
        pointerIdleNotified = true;
        runPendingPathLodRebuildAfterMotion();
        notifyCameraMotionIdleListeners();
      };

      const notifyPointerIdleIfNeeded = () => {
        if (pointerIdleNotified) return;
        if (
          !cameraControls.isGlobeViewportPointerIdle(GlobeConsts.VIEWPORT_DETECT_IDLE_MS)
        ) {
          return;
        }
        isClientIdle = true;
        pointerIdleNotified = true;
        maybeSchedulePathLodRebuildOnClientIdle();
        notifyCameraMotionIdleListeners();
      };

      const stopViewportSampler = () => {
        if (viewportSamplerTimer !== null) {
          clearTimeout(viewportSamplerTimer);
          viewportSamplerTimer = null;
        }
        if (idleDetectTimer !== null) {
          clearTimeout(idleDetectTimer);
          idleDetectTimer = null;
        }
        busySamplingActive = false;
      };

      const runViewportCenterSample = () => {
        if (cancelled || !viewer) return;
        const p = computeViewportCenterLatLon(viewer, Cesium);
        if (p) viewportCenterLatLonRef.current = p;
        viewportBoundsLatLonRef.current = computeViewportBoundsFromViewer(
          viewer,
          Cesium,
        );
        cameraHeightMRef.current =
          viewer.camera.positionCartographic.height ?? Number.POSITIVE_INFINITY;
        mapMarker.refreshViewportFollowFromCache();
        if (p) debugCrosshair?.notifyViewportCenterSampled();
        viewer.scene.requestRender();
        notifyViewportChangeListeners();
      };

      /** Single deferred sample when motion has settled (does not reschedule). */
      const scheduleNextViewportCenterSample = () => {
        if (cancelled || !viewer) return;
        if (viewportSamplerTimer !== null) {
          clearTimeout(viewportSamplerTimer);
          viewportSamplerTimer = null;
        }
        viewportSamplerTimer = window.setTimeout(() => {
          viewportSamplerTimer = null;
          runViewportCenterSample();
        }, 0);
      };

      cameraMotionSettledRef.run = () => {
        if (cancelled || !viewer) return;
        scheduleNextViewportCenterSample();
        armIdleDetection();
        notifyCameraMotionIdleIfNeeded();
      };

      const armIdleDetection = () => {
        if (idleDetectTimer !== null) {
          clearTimeout(idleDetectTimer);
          idleDetectTimer = null;
        }
        idleDetectTimer = window.setTimeout(() => {
          idleDetectTimer = null;
          if (cancelled || !viewer) return;
          if (
            !cameraControls.isGlobeViewportPointerIdle(GlobeConsts.VIEWPORT_DETECT_IDLE_MS)
          ) {
            armIdleDetection();
            return;
          }
          notifyPointerIdleIfNeeded();
        }, GlobeConsts.VIEWPORT_DETECT_IDLE_MS);
      };

      const busySamplingTick = () => {
        if (cancelled || !viewer) {
          busySamplingActive = false;
          return;
        }
        tickGeoArrivalLock();
        runViewportCenterSample();
        if (cameraControls.shouldContinueViewportCenterSampling()) {
          viewportSamplerTimer = window.setTimeout(busySamplingTick, GlobeConsts.UPDATE_VIEWPORT_CENTER_DELAY_MS);
        } else {
          busySamplingActive = false;
          armIdleDetection();
          if (!cameraControls.isGlobeViewportSamplerBusy()) {
            notifyCameraMotionIdleIfNeeded();
          }
        }
      };

      const ensureBusySampling = () => {
        if (cancelled || !viewer) return;
        const armAction = viewportCenterBusySamplingArmAction({
          shouldContinueSampling:
            cameraControls.shouldContinueViewportCenterSampling(),
          busySamplingActive,
          hasScheduledTick: viewportSamplerTimer !== null,
        });
        if (armAction === "noop") return;
        if (armAction === "start") {
          busySamplingActive = true;
          runViewportCenterSample();
          tickGeoArrivalLock();
        }
        // Replace any pending single-shot sample (e.g. from motion-settled) so
        // continuous zoom/rotate always gets a busy tick loop.
        if (viewportSamplerTimer !== null) {
          clearTimeout(viewportSamplerTimer);
          viewportSamplerTimer = null;
        }
        viewportSamplerTimer = window.setTimeout(
          busySamplingTick,
          GlobeConsts.UPDATE_VIEWPORT_CENTER_DELAY_MS,
        );
      };

      viewportSamplerWakeRef.ensureBusy = ensureBusySampling;
      ensureBusySamplingRef.current = ensureBusySampling;
      viewportSamplerIdleCallbacks.armIdleDetection = armIdleDetection;
      armIdleDetectionRef.current = armIdleDetection;
      requestViewportResyncRef.current = () => {
        ensureBusySampling();
        runViewportCenterSample();
      };

      const replayPendingCameraCommands = () => {
        const pending = pendingAnimateToRef.current;
        if (pending) {
          pendingAnimateToRef.current = null;
          cameraControls.animateTo(pending.lat, pending.long, pending.durationMs);
        }
        const pendingSnap = pendingSnapToRef.current;
        if (pendingSnap) {
          pendingSnapToRef.current = null;
          cameraControls.snapTo(pendingSnap.lat, pendingSnap.long);
        }
        const pendingZoom = pendingZoomToInitRef.current;
        if (pendingZoom) {
          pendingZoomToInitRef.current = null;
          if (pendingZoom.snap) cameraControls.snapZoomToInitTarget();
          else cameraControls.animateZoomToInitTarget(pendingZoom.durationMs);
        }
        const pendingZoomHeight = pendingZoomToHeightRef.current;
        if (pendingZoomHeight) {
          pendingZoomToHeightRef.current = null;
          if (pendingZoomHeight.snap) {
            cameraControls.snapZoomToCameraHeightM(pendingZoomHeight.heightM);
          } else {
            cameraControls.animateZoomToCameraHeightM(
              pendingZoomHeight.heightM,
              pendingZoomHeight.durationMs,
            );
          }
        }
        const pendingZoomOrbit = pendingZoomToOrbitRef.current;
        if (pendingZoomOrbit) {
          pendingZoomToOrbitRef.current = null;
          if (pendingZoomOrbit.snap) {
            cameraControls.snapZoomToOrbitCenterDistanceM(pendingZoomOrbit.centerDistanceM);
          } else {
            cameraControls.animateZoomToOrbitCenterDistanceM(
              pendingZoomOrbit.centerDistanceM,
              pendingZoomOrbit.durationMs,
            );
          }
        }
      };

      replayPendingCameraCommands();

      const samplerKickOnCameraChanged = () => {
        if (cancelled || !viewer) return;
        tickGeoArrivalLock();
        cameraHeightMRef.current =
          viewer.camera.positionCartographic.height ?? Number.POSITIVE_INFINITY;
        if (cameraControls.shouldContinueViewportCenterSampling()) {
          ensureBusySampling();
        }
      };

      runViewportCenterSample();
      armIdleDetection();
      viewer.camera.changed.addEventListener(samplerKickOnCameraChanged);

      // Fade layers + globe SSE from altitude. Coalesce via rAF so rapid camera
      // changes during pan/zoom don't synchronously thrash imagery layer state.
      let lodRafId: number | null = null;
      let pendingLodHeightM: number | null = null;

      const applyLodVisualState = (heightM: number) => {
        if (!viewer) return;
        const lod = globeLodVisualStateFromCameraHeightM(heightM);
        detailLayer.alpha = lod.detailAlpha;
        // Hide entirely (skip tile fetches) while fully transparent so the
        // base layer gets the full network/CPU budget — otherwise zoomed-out
        // views can show unloaded dark-purple chunks because all three layers
        // are competing for OSM/CARTO request slots.
        detailLayer.show = lod.detailShow;
        streetLayer.alpha = lod.streetAlpha;
        streetLayer.show = lod.streetShow;
        viewer.scene.globe.maximumScreenSpaceError = lod.maximumScreenSpaceError;
        const fxaa = viewer.scene.postProcessStages.fxaa;
        if (fxaa) fxaa.enabled = lod.fxaaEnabled;
        viewer.scene.requestRender();
      };

      const scheduleLodUpdate = () => {
        if (!viewer) return;
        pendingLodHeightM = viewer.camera.positionCartographic.height ?? 8_000_000;
        if (lodRafId !== null) return;
        lodRafId = requestAnimationFrame(() => {
          lodRafId = null;
          const h = pendingLodHeightM ?? 8_000_000;
          pendingLodHeightM = null;
          applyLodVisualState(h);
        });
      };

      applyLodVisualState(viewer.camera.positionCartographic.height ?? 8_000_000);
      viewer.camera.changed.addEventListener(scheduleLodUpdate);

      const ro = new ResizeObserver(() => {
        viewer?.resize();
        viewer?.forceResize();
        pathHandle.rebuildActivePath();
        viewer?.scene.requestRender();
      });
      ro.observe(mount);

      // Store for cleanup via closure below.
      return {
        ro,
        onCameraChanged: scheduleLodUpdate,
        cancelLodRaf: () => {
          if (lodRafId !== null) {
            cancelAnimationFrame(lodRafId);
            lodRafId = null;
          }
          pendingLodHeightM = null;
        },
        tileProcessor,
        onSamplerCameraChanged: samplerKickOnCameraChanged,
        camera: viewer.camera,
        clickedIndicator,
        pathHandle,
        mapMarker,
        debugCrosshair,
        stopViewportSampler,
        removeInputListeners: () => {
          cameraControls.destroy();
        },
      };
    };

    let ro: ResizeObserver | null = null;
    let cleanup:
      | {
          ro: ResizeObserver;
          onCameraChanged: () => void;
          cancelLodRaf: () => void;
          onSamplerCameraChanged: () => void;
          tileProcessor: TwoToneTileProcessor;
          camera: CesiumTypes.Camera;
          clickedIndicator: { destroy: () => void };
          pathHandle: PathHandle;
          mapMarker: ReturnType<typeof installMapMarker>;
          debugCrosshair: ReturnType<typeof installDebugCrosshair>;
          stopViewportSampler: () => void;
          removeInputListeners: () => void;
        }
      | null = null;
    init()
      .then((c) => {
        if (!c) return;
        ro = c.ro;
        cleanup = c;
      })
      .catch((err) => {
        // Don't swallow the real error; it makes "Failed to initialize" impossible to debug.
        console.error("Cesium init failed", err);
        mount.textContent = "Failed to initialize Cesium globe. Check console for details.";
      });

    return () => {
      cancelled = true;
      if (pathLodStateRef.current.debounceTimerId !== null) {
        window.clearTimeout(pathLodStateRef.current.debounceTimerId);
        pathLodStateRef.current.debounceTimerId = null;
      }
      cleanup?.stopViewportSampler();
      cleanup?.cancelLodRaf();
      if (cleanup) {
        cleanup.camera.changed.removeEventListener(cleanup.onSamplerCameraChanged);
      }
      cleanup?.camera.changed.removeEventListener(cleanup.onCameraChanged);
      cleanup?.tileProcessor.destroy();
      cleanup?.removeInputListeners();
      cleanup?.clickedIndicator.destroy();
      cleanup?.pathHandle.destroy();
      pathHandleRef.current = null;
      cleanup?.mapMarker.destroy();
      mapMarkerRef.current = null;
      cleanup?.debugCrosshair?.destroy();
      ro?.disconnect();
      viewer?.destroy();
      viewerRef.current = null;
      cesiumNsRef.current = null;
      viewportCenterLatLonRef.current = null;
      viewportBoundsLatLonRef.current = null;
      cameraHeightMRef.current = Number.POSITIVE_INFINITY;
      isClientIdle = false;
      geoArrivalLockStateRef.current = GeoArrival.initialGeoArrivalLockState();
      // Drop the imperative-handle target so a late `animateTo` can't drive a
      // destroyed viewer. Future calls will re-queue into pendingAnimateToRef.
      cameraControlsRef.current = null;
      requestViewportResyncRef.current = null;
      ensureBusySamplingRef.current = null;
      armIdleDetectionRef.current = null;
    };
  // Re-init only when layout width changes. Init lat/long, snap-to-geo framing, and
  // camera init height are applied at first install and updated at runtime via the
  // imperative handle (`animateTo`, `setCameraInitSurfaceOffsetM`, etc.) without
  // tearing down the Cesium viewer.
  }, [width]);

  const fillParent = typeof width === "string" && width === "100%";

  return (
    <>
      <div
        ref={containerRef}
        className={
          fillParent
            ? "h-full w-full min-h-0 min-w-0 flex-1"
            : "h-full w-full"
        }
        style={
          fillParent
            ? {
                position: "relative",
                width: "100%",
                height:
                  typeof height === "string" && height === "100%"
                    ? "100%"
                    : dimensionCss(height),
                minHeight:
                  typeof height === "string" && height === "100%"
                    ? "100%"
                    : dimensionCss(height),
              }
            : {
                position: "relative",
                width: dimensionCss(width),
                minHeight: dimensionCss(height),
              }
        }
      >
        <div ref={mountRef} className="h-full w-full" />
        {mapMarkerStaticOverlay ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            aria-hidden
          >
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full"
              style={{
                width: MapMarkerConsts.SIZE,
                height: MapMarkerConsts.SIZE,
              }}
            >
              <img
                alt=""
                className="block h-full w-full select-none object-contain"
                draggable={false}
                height={MapMarkerConsts.SIZE}
                src={MapMarkerConsts.IMAGE}
                style={{
                  opacity: MapMarkerConsts.OPACITY,
                  // Thin dark rim around the alpha silhouette (Cesium-style billboard edge).
                  filter:
                    "drop-shadow(0 0 0.55px rgba(12, 13, 18, 0.92)) drop-shadow(0 0 1.15px rgba(12, 13, 18, 0.42))",
                }}
                width={MapMarkerConsts.SIZE}
              />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

