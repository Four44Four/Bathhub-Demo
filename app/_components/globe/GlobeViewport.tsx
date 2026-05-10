"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  type Ref,
  type RefObject,
} from "react";
import type * as CesiumTypes from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import { Globe as GlobeConsts } from "../ComponentConstants";
import * as Utils from "../Utils";
import * as ServerDebug from "../../_server/Debug";
import { type Point } from "../../_shared/Utils";
import { installClickedIndicator } from "./ClickedIndicator";
import { installMapMarker } from "./MapMarker";
import { installOrbitCameraControls, type InstalledOrbitCameraControls } from "./Camera";

/** Sample interval while dragging, pinching, wheel-zoom smoothing, or programmatic camera animation is active. */
const UPDATE_GLOBE_VIEWPORT_CENTER_DELAY_MS = 50;
/**
 * After this many milliseconds with no active globe drag/zoom/animation (`isGlobeViewportSamplerBusy`),
 * the client is treated as idle for viewport-center sampling.
 */
const GLOBE_VIEWPORT_DETECT_IDLE_MS = 500;

/** Set to true once `GLOBE_VIEWPORT_DETECT_IDLE_MS` elapses without move/zoom activity; cleared when activity resumes. */
let isClientIdle = false;

function computeViewportCenterLatLon(
  viewer: CesiumTypes.Viewer,
  Cesium: typeof import("cesium"),
): Point | null {
  const canvas = viewer.scene.canvas;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (cw < 1 || ch < 1) return null;
  const center = new Cesium.Cartesian2(cw / 2, ch / 2);
  const ellipsoid = viewer.scene.globe.ellipsoid;

  // Match tap picking (`Camera.ts` pointer-up): `globe.pick` alone skews at max zoom where the
  // depth buffer matches the draped imagery better than ray–globe mesh intersection.
  let carto: CesiumTypes.Cartographic | undefined;

  try {
    if (viewer.scene.pickPositionSupported) {
      const world = viewer.scene.pickPosition(center);
      if (Cesium.defined(world)) {
        carto = Cesium.Cartographic.fromCartesian(world as CesiumTypes.Cartesian3, ellipsoid);
      }
    }
  } catch {
    // ignore
  }

  if (!carto) {
    try {
      const ray = viewer.camera.getPickRay(center);
      if (ray) {
        const gp = viewer.scene.globe.pick(ray, viewer.scene);
        if (Cesium.defined(gp)) {
          carto = Cesium.Cartographic.fromCartesian(gp as CesiumTypes.Cartesian3, ellipsoid);
        }
      }
    } catch {
      // ignore
    }
  }

  if (!carto) {
    const world = viewer.camera.pickEllipsoid(center, ellipsoid);
    if (world) {
      carto = Cesium.Cartographic.fromCartesian(world, ellipsoid);
    }
  }

  if (!carto) return null;
  const lat = Cesium.Math.toDegrees(carto.latitude);
  const lon = Cesium.Math.toDegrees(carto.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { latitude: lat, longitude: lon };
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
  /** Lat/long where the map surface lies under the viewport center (camera look target). */
  getViewportCenterLatLon: () => Point | null;
  /** Lat/long of the tap/click marker on the globe, if the user has clicked. */
  getClickedIndicatorLatLon: () => Point | null;
};

type GlobeViewportProps = {
  initLat: number;
  initLong: number;
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
   * React 19 ref-as-prop. Receives a `GlobeViewportHandle` once the Cesium
   * viewer has finished initializing.
   */
  ref?: Ref<GlobeViewportHandle | null>;
};

function pixelIsWater(r: number, g: number, b: number) {
  // Heuristic: classify "blue-ish" pixels as water.
  // Map tiles include a lot of colors; this doesn't have perfect land/water semantics,
  // but it enforces the requested two-color palette deterministically.
  const maxRG = Math.max(r, g);
  const blueDominance = b - maxRG;
  return b > 60 && blueDominance > 20 && b > 1.05 * g;
}

async function recolorTileToTwoTone(
  image: ImageBitmap | HTMLImageElement,
  water: { r: number; g: number; b: number },
  land: { r: number; g: number; b: number },
) {
  const width = image.width;
  const height = image.height;

  const landHsl = Utils.rgbToHsl(land.r, land.g, land.b);
  const waterHsl = Utils.rgbToHsl(water.r, water.g, water.b);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return undefined;

  ctx.drawImage(image, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i + 0];
    const g = d[i + 1];
    const b = d[i + 2];
    const isWater = pixelIsWater(r, g, b);

    // Preserve map detail (roads/labels/features) by using the original pixel's lightness
    // while forcing the hue to match the requested land/water colors.
    const srcHsl = Utils.rgbToHsl(r, g, b);

    if (isWater) {
      const l = Utils.clamp01(0.25 + srcHsl.l * 0.35);
      const s = Utils.clamp01(waterHsl.s * 0.9);
      const out = Utils.hslToRgb(waterHsl.h, s, l);
      d[i + 0] = out.r;
      d[i + 1] = out.g;
      d[i + 2] = out.b;
    } else {
      // Boost contrast on land so streets + features are easier to see.
      const l = Utils.clamp01(0.18 + srcHsl.l * 0.70);
      const s = Utils.clamp01(Math.max(landHsl.s, srcHsl.s * 0.35));
      const out = Utils.hslToRgb(landHsl.h, s, l);
      d[i + 0] = out.r;
      d[i + 1] = out.g;
      d[i + 2] = out.b;
    }

    d[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);

  // Cesium accepts ImageBitmap as a texture source in most runtimes.
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(canvas);
  }

  // Fallback: return the canvas itself.
  return canvas;
}

function dimensionCss(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value;
}

export function GlobeViewport({
  initLat,
  initLong,
  width,
  height,
  zoomIndicatorRootRef,
  onZoomIndicatorPulse,
  ref,
}: GlobeViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // The orbit camera controls are created inside an async init() below; until
  // they exist, queue the most recent `animateTo` request and replay it once
  // the viewer is ready.
  const cameraControlsRef = useRef<InstalledOrbitCameraControls | null>(null);
  const pendingAnimateToRef = useRef<{ lat: number; long: number; durationMs?: number } | null>(null);
  const pendingZoomToInitRef = useRef<{ durationMs?: number; snap?: boolean } | null>(null);
  const viewerRef = useRef<CesiumTypes.Viewer | null>(null);
  const cesiumNsRef = useRef<typeof import("cesium") | null>(null);
  const clickedIndicatorApiRef = useRef<
    ReturnType<typeof installClickedIndicator> | null
  >(null);
  /** Shared cache for `getViewportCenterLatLon`, MapMarker viewport-follow mode, and callers like `getStartPos`. */
  const viewportCenterLatLonRef = useRef<Point | null>(null);

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
      getViewportCenterLatLon: () => viewportCenterLatLonRef.current,
      getClickedIndicatorLatLon: () => {
        const api = clickedIndicatorApiRef.current;
        if (!api) return null;
        const p = api.getLatLonDegrees();
        if (!p) return null;
        return { latitude: p.lat, longitude: p.lon };
      },
    }),
    [],
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Ensure Cesium can load its Workers/Assets/Widgets from a known base URL.
    // This avoids needing a webpack copy step in Next.js.
    const w = window as unknown as { CESIUM_BASE_URL?: string };
    w.CESIUM_BASE_URL = "https://cdn.jsdelivr.net/npm/cesium@1.141.0/Build/Cesium";

    // Clear any previous content (e.g. from an earlier init).
    mount.textContent = "";

    let viewer: CesiumTypes.Viewer | null = null;
    let cancelled = false;

    const init = async () => {
      const Cesium = await import("cesium");
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

      // Create a custom provider that recolors tiles into the requested two solid colors.
      class SolidColorImageryProvider extends Cesium.UrlTemplateImageryProvider {
        private water = Utils.hexToRgb(GlobeConsts.WATER_COLOR);
        private land = Utils.hexToRgb(GlobeConsts.LAND_COLOR);

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

          const water = this.water;
          const land = this.land;

          return basePromise.then(async (baseImage) => {
            const img = baseImage as unknown as ImageBitmap | HTMLImageElement;
            try {
              const recolored = await recolorTileToTwoTone(img, water, land);
              if (recolored) return recolored as CesiumTypes.ImageryTypes;
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
      clickedIndicatorApiRef.current = clickedIndicator;

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
      const cameraControls = installOrbitCameraControls({
        Cesium,
        viewer,
        ellipsoid,
        radius,
        initLat,
        initLong,
        width,
        containerRef,
        zoomIndicatorRootRef,
        onZoomIndicatorPulse,
        onGlobeViewportInteraction: () => viewportSamplerWakeRef.ensureBusy?.(),
        onClickLatLonDegrees: (lat, lon) => {
          const logString = `Lat: ${lat}, Lon: ${lon}`;
          ServerDebug.log(logString);
          console.log(logString);
          clickedIndicator.setLatLonDegrees(lat, lon);
        },
      });

      // Publish the controls for the imperative `animateTo` handle. If the
      // parent already requested an animation while we were initializing
      // (e.g. geolocation resolved faster than Cesium loaded), replay it now.
      cameraControlsRef.current = cameraControls;
      const pending = pendingAnimateToRef.current;
      if (pending) {
        pendingAnimateToRef.current = null;
        cameraControls.animateTo(pending.lat, pending.long, pending.durationMs);
      }
      const pendingZoom = pendingZoomToInitRef.current;
      if (pendingZoom) {
        pendingZoomToInitRef.current = null;
        if (pendingZoom.snap) cameraControls.snapZoomToInitTarget();
        else cameraControls.animateZoomToInitTarget(pendingZoom.durationMs);
      }

      const mapMarker = installMapMarker(Cesium, viewer, () => viewportCenterLatLonRef.current);

      isClientIdle = false;

      let viewportSamplerTimer: number | null = null;
      let idleDetectTimer: number | null = null;
      let busySamplingActive = false;

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
        mapMarker.refreshViewportFollowFromCache();
        viewer.scene.requestRender();
      };

      /** Single deferred sample when the client has just been classified idle (does not reschedule). */
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

      const armIdleDetection = () => {
        if (idleDetectTimer !== null) {
          clearTimeout(idleDetectTimer);
          idleDetectTimer = null;
        }
        idleDetectTimer = window.setTimeout(() => {
          idleDetectTimer = null;
          if (cancelled || !viewer || cameraControls.isGlobeViewportSamplerBusy()) return;
          isClientIdle = true;
          scheduleNextViewportCenterSample();
        }, GLOBE_VIEWPORT_DETECT_IDLE_MS);
      };

      const busySamplingTick = () => {
        if (cancelled || !viewer) {
          busySamplingActive = false;
          return;
        }
        runViewportCenterSample();
        if (cameraControls.isGlobeViewportSamplerBusy()) {
          viewportSamplerTimer = window.setTimeout(busySamplingTick, UPDATE_GLOBE_VIEWPORT_CENTER_DELAY_MS);
        } else {
          busySamplingActive = false;
          isClientIdle = false;
          armIdleDetection();
        }
      };

      const ensureBusySampling = () => {
        if (cancelled) return;
        isClientIdle = false;
        if (idleDetectTimer !== null) {
          clearTimeout(idleDetectTimer);
          idleDetectTimer = null;
        }
        if (busySamplingActive) return;
        busySamplingActive = true;
        if (viewportSamplerTimer !== null) {
          clearTimeout(viewportSamplerTimer);
          viewportSamplerTimer = null;
        }
        // Sample immediately so brief drags/zooms still update before the first delayed tick.
        runViewportCenterSample();
        viewportSamplerTimer = window.setTimeout(busySamplingTick, UPDATE_GLOBE_VIEWPORT_CENTER_DELAY_MS);
      };

      viewportSamplerWakeRef.ensureBusy = ensureBusySampling;

      const samplerKickOnCameraChanged = () => {
        if (cancelled || !viewer) return;
        if (cameraControls.isGlobeViewportSamplerBusy()) {
          ensureBusySampling();
        }
      };

      runViewportCenterSample();
      armIdleDetection();
      viewer.camera.changed.addEventListener(samplerKickOnCameraChanged);

      // Fade the high-zoom detail layer in well before the base layer's coarse
      // tiles become visibly chunky. The base layer's max level (9) means tiles
      // are ~78km wide at the equator; any altitude near or below that produces
      // visible "chunks", so we want the detail layer fully opaque well above it.
      const detailFadeStart = 8_000_000; // ~8000km — start crossfading early
      const detailFullyVisible = 1_500_000; // ~1500km — fully on before base looks chunky
      const updateDetail = () => {
        if (!viewer) return;
        const h = viewer?.camera.positionCartographic.height ?? detailFadeStart;
        const t = (detailFadeStart - h) / (detailFadeStart - detailFullyVisible);
        const detailAlpha = Math.min(1, Math.max(0, t));
        detailLayer.alpha = detailAlpha;
        // Hide entirely (skip tile fetches) while fully transparent so the
        // base layer gets the full network/CPU budget — otherwise zoomed-out
        // views can show unloaded dark-purple chunks because all three layers
        // are competing for OSM/CARTO request slots.
        detailLayer.show = detailAlpha > 0;

        // "Street view" fade: only when super close so labels/buildings are readable and stable.
        const streetFadeStart = 35_000; // ~35km
        const streetFullyVisible = 2_500; // ~2.5km
        const ts = (streetFadeStart - h) / (streetFadeStart - streetFullyVisible);
        const streetAlpha = Math.min(1, Math.max(0, ts));
        streetLayer.alpha = streetAlpha;
        streetLayer.show = streetAlpha > 0;

        // Drive Cesium's tile-loading aggressiveness with altitude. Lower values
        // load finer tiles earlier, eliminating the "chunky LOD" look at medium
        // zooms without the cost of forcing max detail at far-out views.
        const superClose = 1_000; // ~1km
        viewer.scene.globe.maximumScreenSpaceError =
          h < superClose
            ? 0.35
            : h < streetFadeStart
              ? 0.75
              : h < detailFullyVisible
                ? 1.25
                : h < detailFadeStart
                  ? 1.6
                  : 2.0;

        // FXAA can soften thin text/lines; disable it when close for crisper labels.
        const fxaa = viewer.scene.postProcessStages.fxaa;
        if (fxaa) fxaa.enabled = !(h < streetFadeStart);

        viewer.scene.requestRender();
      };
      updateDetail();
      viewer.camera.changed.addEventListener(updateDetail);

      const ro = new ResizeObserver(() => {
        viewer?.resize();
        viewer?.forceResize();
        viewer?.scene.requestRender();
      });
      ro.observe(mount);

      // Store for cleanup via closure below.
      return {
        ro,
        onCameraChanged: updateDetail,
        onSamplerCameraChanged: samplerKickOnCameraChanged,
        camera: viewer.camera,
        clickedIndicator,
        mapMarker,
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
          onSamplerCameraChanged: () => void;
          camera: CesiumTypes.Camera;
          clickedIndicator: { destroy: () => void };
          mapMarker: ReturnType<typeof installMapMarker>;
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
      cleanup?.stopViewportSampler();
      if (cleanup) {
        cleanup.camera.changed.removeEventListener(cleanup.onSamplerCameraChanged);
      }
      cleanup?.camera.changed.removeEventListener(cleanup.onCameraChanged);
      cleanup?.removeInputListeners();
      cleanup?.clickedIndicator.destroy();
      cleanup?.mapMarker.destroy();
      ro?.disconnect();
      viewer?.destroy();
      viewerRef.current = null;
      cesiumNsRef.current = null;
      clickedIndicatorApiRef.current = null;
      viewportCenterLatLonRef.current = null;
      isClientIdle = false;
      // Drop the imperative-handle target so a late `animateTo` can't drive a
      // destroyed viewer. Future calls will re-queue into pendingAnimateToRef.
      cameraControlsRef.current = null;
    };
  }, [initLat, initLong, width]);

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
      </div>
    </>
  );
}

