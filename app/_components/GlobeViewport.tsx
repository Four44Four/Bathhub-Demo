"use client";

import { useEffect, useRef } from "react";
import type * as CesiumTypes from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import * as GlobeConstants from "./GlobeConstants";

type GlobeViewportProps = {
  initLat: number;
  initLong: number;
};


function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHsl(r255: number, g255: number, b255: number) {
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp >= 1 && hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp >= 2 && hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp >= 3 && hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp >= 4 && hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  const m = l - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

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

  const landHsl = rgbToHsl(land.r, land.g, land.b);
  const waterHsl = rgbToHsl(water.r, water.g, water.b);

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
    const srcHsl = rgbToHsl(r, g, b);

    if (isWater) {
      const l = clamp01(0.25 + srcHsl.l * 0.35);
      const s = clamp01(waterHsl.s * 0.9);
      const out = hslToRgb(waterHsl.h, s, l);
      d[i + 0] = out.r;
      d[i + 1] = out.g;
      d[i + 2] = out.b;
    } else {
      // Boost contrast on land so streets + features are easier to see.
      const l = clamp01(0.18 + srcHsl.l * 0.70);
      const s = clamp01(Math.max(landHsl.s, srcHsl.s * 0.35));
      const out = hslToRgb(landHsl.h, s, l);
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

export function GlobeViewport({ initLat, initLong }: GlobeViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

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
        private water = hexToRgb(GlobeConstants.WATER_COLOR);
        private land = hexToRgb(GlobeConstants.LAND_COLOR);

        async requestImage(
          x: number,
          y: number,
          level: number,
          request?: CesiumTypes.Request,
        ) {
          const baseImage = (await super.requestImage(
            x,
            y,
            level,
            request,
          )) as unknown as ImageBitmap | HTMLImageElement | undefined;

          if (!baseImage) {
            const placeholder = document.createElement("canvas");
            placeholder.width = 1;
            placeholder.height = 1;
            const ctx = placeholder.getContext("2d");
            if (ctx) {
              ctx.fillStyle = GlobeConstants.WATER_COLOR;
              ctx.fillRect(0, 0, 1, 1);
            }
            if (typeof createImageBitmap === "function") {
              return await createImageBitmap(placeholder);
            }
            return placeholder;
          }

          try {
            const recolored = await recolorTileToTwoTone(baseImage, this.water, this.land);
            if (recolored) return recolored;
          } catch {
            // If Google tiles block pixel reading due to CORS, just show the original imagery.
          }

          return baseImage;
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

      // Reduce GPU usage: render only when needed, and throttle periodic renders.
      // When enabled, Cesium will render on interaction/changes (we also call requestRender explicitly).
      viewer.scene.requestRenderMode = true;
      // Maximum time delta (seconds) before Cesium renders again due to time changes.
      // Smaller => more frequent renders. Larger => fewer background renders.
      viewer.scene.maximumRenderTimeChange = 1 / 15; // ~15 FPS max for "background" updates

      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString(GlobeConstants.WATER_COLOR);
      // Render crisply on high-DPI displays (avoid blurry labels when zoomed in).
      // Cap to avoid runaway GPU cost on very high-DPI monitors.
      viewer.resolutionScale = Math.min(3, window.devicePixelRatio || 1);

      // Favor loading higher-zoom tiles when close.
      viewer.scene.globe.preloadAncestors = true;
      viewer.scene.globe.preloadSiblings = true;

      // Firefox-specific stability: some GPU/driver combos can appear to "drop" globe tiles
      // during motion due to aggressive culling/eviction. These settings trade memory for
      // fewer visible unload/reload pops.
      const isFirefox =
        typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent) && !/seamonkey/i.test(navigator.userAgent);
      if (isFirefox) {
        // Keep more tiles resident to avoid rapid eviction when the view frustum changes.
        (viewer.scene.globe as unknown as { tileCacheSize?: number }).tileCacheSize = 2000;
        // Reduce "popping" at the horizon / edge cases.
        (viewer.scene.globe as unknown as { backFaceCulling?: boolean }).backFaceCulling = false;
      }

      // Recolor imagery tiles to the required palette.
      // Use OpenStreetMap standard tile server. Respect their usage policy if you deploy this.
      // Docs: https://operations.osmfoundation.org/policies/tiles/
      const url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      const provider = new SolidColorImageryProvider({
        url,
        subdomains: ["a", "b", "c"],
        credit: "© OpenStreetMap contributors",
        minimumLevel: 0,
        maximumLevel: 7, // multiple LOD steps via the tile pyramid
        tileWidth: 256,
        tileHeight: 256,
      });

      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(provider);

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
      detailLayer.show = true;

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
      streetLayer.show = true;

      // Center the camera on the requested init lat/long.
      const radius = ellipsoid.maximumRadius;
      // const globeCenter = Cesium.Cartesian3.ZERO;

      // Orbital camera state (camera always looks at globe center).
      // theta: longitude-like angle around Z axis; phi: latitude-like angle from equator.
      let theta = (initLong * Math.PI) / 180;
      let phi = (initLat * Math.PI) / 180;
      let range = radius * 3.0;

      const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
      const EPS = 1e-3;

      const unitFromAngles = (t: number, p: number) =>
        new Cesium.Cartesian3(Math.cos(p) * Math.cos(t), Math.cos(p) * Math.sin(t), Math.sin(p));

      const computeUp = (dirFromCenter: CesiumTypes.Cartesian3) => {
        // Try to keep "up" roughly aligned with world +Z, projected onto the tangent plane.
        const z = Cesium.Cartesian3.UNIT_Z;
        const dot = Cesium.Cartesian3.dot(z, dirFromCenter);
        const proj = Cesium.Cartesian3.multiplyByScalar(dirFromCenter, dot, new Cesium.Cartesian3());
        const up = Cesium.Cartesian3.subtract(z, proj, new Cesium.Cartesian3());
        const mag = Cesium.Cartesian3.magnitude(up);
        if (mag < 1e-6) return Cesium.Cartesian3.UNIT_Y;
        return Cesium.Cartesian3.normalize(up, up);
      };

      const applyOrbit = () => {
        // Keep camera in the world frame so orbit/zoom are always centered on globe center.
        viewer?.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        const dir = unitFromAngles(theta, phi);
        const destination = Cesium.Cartesian3.multiplyByScalar(dir, range, new Cesium.Cartesian3());
        const direction = Cesium.Cartesian3.negate(dir, new Cesium.Cartesian3());
        const up = computeUp(dir);
        viewer?.camera.setView({
          destination,
          orientation: { direction, up },
        });
        viewer?.scene.requestRender();
      };

      applyOrbit();

      // "Kick" Cesium rendering after layout settles. In some Next/app layouts the canvas
      // starts with a stale/0 size and the globe won't appear until a later resize event.
      // const kickInitialRender = () => {
      //   viewer?.resize();
      //   viewer?.forceResize();
      //   viewer?.scene.requestRender();
      // };
      // kickInitialRender();
      // requestAnimationFrame(() => kickInitialRender());
      // requestAnimationFrame(() => requestAnimationFrame(() => kickInitialRender()));

      // Zoom constraints: keep a minimum clearance above the surface so we never clip
      // through the ellipsoid (which can show black).
      
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = GlobeConstants.MIN_SURFACE_CLEARANCE_M;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = radius * 20.0;

      const controller = viewer.scene.screenSpaceCameraController;

      // We implement all interaction ourselves to ensure:
      // - Left-drag / 1-finger drag: orbit around globe center (no free camera rotation).
      // - Right-drag: zoom.
      // - Camera always points at globe center.
      controller.enableInputs = false;
      controller.enableRotate = false;
      controller.enableLook = false;
      controller.enableTilt = false;
      controller.enableTranslate = false;
      controller.enableZoom = false;

      // Preserve camera angle (pitch) during collisions: disable tilt changes from input,
      // but keep collision detection and a safety tilt clamp.
      controller.maximumTiltAngle = Math.PI / 2.0;
      controller.enableCollisionDetection = true;

      const canvas = viewer.scene.canvas;
      canvas.style.touchAction = "none";

      const pointers = new Map<number, { x: number; y: number }>();
      const pointerDownMeta = new Map<number, { x: number; y: number; t: number; button?: number }>();
      let mode: "none" | "rotate" | "zoomDrag" | "pinchZoom" = "none";
      let lastPinchDist = 0;


      // const ZOOM_RATE_DECAY_FACTOR = 3.0;
      // const ROTATE_MAX_SPEED_MULT = 5.0;

      const initialRange = range;

      const getMinRange = () => {
        const minSurface =
          viewer?.scene.screenSpaceCameraController.minimumZoomDistance ?? GlobeConstants.MIN_SURFACE_CLEARANCE_M;
        return radius + minSurface;
      };

      const closeFactor01 = () => {
        // 1.0 at initial distance, 0.0 at (or below) min range.
        // If the remaining distance-to-min is halved, this factor halves too.
        const minRange = getMinRange();
        const denom = Math.max(1, initialRange - minRange);
        return clamp((range - minRange) / denom, 0, 1);
      };

      const zoomRateScale01 = () => {
        // Zoom rate decays exponentially as we get close; bottoms out just above 0 at min range.
        // const u = closeFactor01();
        // const minScale = 0.015;
        // if (u <= 0) return minScale;
        // // Exponential curve: u=1 => 1, u->0 => ~0
        // const scaled = Math.exp(-ZOOM_RATE_DECAY_FACTOR * (1 - u));
        // return minScale + clamp(scaled, 0, 1) * (1 - minScale);
        return Math.max(GlobeConstants.ZOOM_MIN, closeFactor01() / GlobeConstants.ZOOM_DECAY_FACTOR);
      };

      const rotateSpeedMultiplier = () => {
        // At min range, keep a minimum speed that makes map text track cursor/finger.
        // Farther out, allow faster-than-cursor rotation.
        // Make the "decay" toward close zoom much slower:
        // for u in (0,1), u^(1/4) stays larger for longer, so rotation doesn't slow down
        // until we're much closer to the min range.
        // const u = Math.pow(, 0.25);
        return Math.max(GlobeConstants.ROTATE_MIN, closeFactor01());// return 1 + u * (ROTATE_MAX_SPEED_MULT - 1);
      };

      const setRange = (next: number) => {
        const minSurface =
          viewer?.scene.screenSpaceCameraController.minimumZoomDistance ??
          GlobeConstants.MIN_SURFACE_CLEARANCE_M;
        const maxSurface = viewer?.scene.screenSpaceCameraController.maximumZoomDistance ?? radius * 20.0;

        // Our orbit `range` is distance from globe center. Convert the surface clearance.
        const minRange = radius + minSurface;
        const maxRange = maxSurface;
        range = clamp(next, minRange, maxRange);
      };

      const onContextMenu = (e: Event) => e.preventDefault();
      const onPointerDown = (e: PointerEvent) => {
        // Pointer capture is the most reliable way to ensure we get the corresponding
        // pointerup even if the cursor/finger leaves the canvas. Some browsers can throw.
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          // Fall back to window-level pointerup listeners (installed below).
        }
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        pointerDownMeta.set(e.pointerId, { x: e.clientX, y: e.clientY, t: Date.now(), button: e.button });

        if (e.pointerType === "mouse") {
          if (e.button === 2) mode = "zoomDrag"; // right drag zooms
          else if (e.button === 0) mode = "rotate"; // left drag rotates globe
        } else {
          // touch / pen
          if (pointers.size === 1) mode = "rotate"; // single finger rotates globe
          if (pointers.size === 2) {
            mode = "pinchZoom"; // pinch/splay zooms
            const [a, b] = Array.from(pointers.values());
            lastPinchDist = Math.hypot(a.x - b.x, a.y - b.y);
          }
        }

        e.preventDefault();
      };

      const onPointerMove = (e: PointerEvent) => {
        const prev = pointers.get(e.pointerId);
        if (!prev) return;
        const next = { x: e.clientX, y: e.clientY };
        pointers.set(e.pointerId, next);

        if (mode === "rotate") {
          const dx = next.x - prev.x;
          const dy = next.y - prev.y;
          // Convert pixel delta to *globe-relative* swept angle.
          // Then apply a zoom-dependent multiplier that bottoms out at 1x near min height,
          // so text can track the cursor/finger at close zoom.
          const frustum = viewer?.camera.frustum as unknown as { fovy?: number; aspectRatio?: number };
          const fovy = frustum?.fovy ?? (60 * Math.PI) / 180;
          const aspect = frustum?.aspectRatio ?? canvas.clientWidth / Math.max(1, canvas.clientHeight);
          const fovx = 2 * Math.atan(Math.tan(fovy / 2) * aspect);

          const w = Math.max(1, canvas.clientWidth);
          const h = Math.max(1, canvas.clientHeight);

          const fxPx = (w / 2) / Math.tan(fovx / 2);
          const fyPx = (h / 2) / Math.tan(fovy / 2);

          const dTheta = (dx * range) / (Math.max(1, fxPx) * radius);
          const dPhi = (dy * range) / (Math.max(1, fyPx) * radius);

          const mult = rotateSpeedMultiplier();
          theta -= dTheta * mult;
          phi = clamp(phi + dPhi * mult, -Math.PI / 2 + EPS, Math.PI / 2 - EPS);
          applyOrbit();
          e.preventDefault();
          return;
        }

        if (mode === "zoomDrag") {
          // Drag up/down to zoom.
          const dy = next.y - prev.y;
          const z = zoomRateScale01();
          const scale = Math.exp(dy * GlobeConstants.ZOOM_SENS * z);
          setRange(range * scale);
          applyOrbit();
          e.preventDefault();
          return;
        }

        if (mode === "pinchZoom" && pointers.size >= 2) {
          const [a, b] = Array.from(pointers.values());
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (lastPinchDist > 0) {
            const z = zoomRateScale01();
            // dist increases => scale < 1 => zoom in (range decreases)
            const scale = Math.pow(lastPinchDist / dist, z);
            setRange(range * scale);
            applyOrbit();
          }
          lastPinchDist = dist;
          e.preventDefault();
        }
      };

      const onPointerUpOrCancel = (e: PointerEvent) => {
        
        const down = pointerDownMeta.get(e.pointerId);
        pointers.delete(e.pointerId);
        pointerDownMeta.delete(e.pointerId);

        // Treat a short, low-movement interaction as a "tap/click".
        // (We still use pointer events for both mouse and touch.)
        if (down && viewer) {
          
          const dt = Date.now() - down.t;
          const dx = e.clientX - down.x;
          const dy = e.clientY - down.y;
          const dist = Math.hypot(dx, dy);

          const isMouseLeftClick = e.pointerType === "mouse" && (down.button ?? e.button) === 0;
          const isTouchTap = e.pointerType !== "mouse";
          const isClickCandidate =
            (isMouseLeftClick || isTouchTap) && dt < 450 && dist < 6 && mode !== "pinchZoom" && mode !== "zoomDrag";

          if (isClickCandidate) {
            const rect = canvas.getBoundingClientRect();
            const pos = new Cesium.Cartesian2(e.clientX - rect.left, e.clientY - rect.top);
            const picked = viewer.camera.pickEllipsoid(pos, ellipsoid);
            if (picked) {
              const carto = Cesium.Cartographic.fromCartesian(picked);
              const lat = Cesium.Math.toDegrees(carto.latitude);
              const lon = Cesium.Math.toDegrees(carto.longitude);
              alert(`Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`);
            }
          }
        }

        if (pointers.size === 0) {
          mode = "none";
          lastPinchDist = 0;
        } else if (pointers.size === 1 && e.pointerType !== "mouse") {
          mode = "rotate";
          lastPinchDist = 0;
        }
        e.preventDefault();
      };

      const onWheel = (e: WheelEvent) => {
        const z = zoomRateScale01();
        const scale = Math.exp(e.deltaY * GlobeConstants.ZOOM_SENS * z * 0.15);
        setRange(range * scale);
        applyOrbit();
        e.preventDefault();
      };

      canvas.addEventListener("contextmenu", onContextMenu);
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUpOrCancel);
      canvas.addEventListener("pointercancel", onPointerUpOrCancel);
      // Extra reliability: some environments don't consistently dispatch pointerup back to
      // the canvas (lost capture, focus changes, etc). Listen globally too.
      canvas.addEventListener("lostpointercapture", onPointerUpOrCancel as unknown as EventListener);
      window.addEventListener("pointerup", onPointerUpOrCancel);
      window.addEventListener("pointercancel", onPointerUpOrCancel);
      canvas.addEventListener("wheel", onWheel, { passive: false });

      // Fade high-zoom details in only when close enough.
      const detailFadeStart = 1_200_000; // ~1200km
      const detailFullyVisible = 250_000; // ~250km
      const updateDetail = () => {
        if (!viewer) return;
        const h = viewer?.camera.positionCartographic.height ?? detailFadeStart;
        const t = (detailFadeStart - h) / (detailFadeStart - detailFullyVisible);
        detailLayer.alpha = Math.min(1, Math.max(0, t));

        // "Street view" fade: only when super close so labels/buildings are readable and stable.
        const streetFadeStart = 35_000; // ~35km
        const streetFullyVisible = 2_500; // ~2.5km
        const ts = (streetFadeStart - h) / (streetFadeStart - streetFullyVisible);
        streetLayer.alpha = Math.min(1, Math.max(0, ts));

        // Increase LOD when close so streets/labels look sharper.
        // Lower values => more detail. Keep it modest until we're very close.
        const superClose = 1_000; // ~1km
        viewer.scene.globe.maximumScreenSpaceError = h < superClose ? 0.35 : h < streetFadeStart ? 0.75 : 2.0;

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
        camera: viewer.camera,
        removeInputListeners: () => {
          canvas.removeEventListener("contextmenu", onContextMenu);
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUpOrCancel);
          canvas.removeEventListener("pointercancel", onPointerUpOrCancel);
          canvas.removeEventListener("lostpointercapture", onPointerUpOrCancel as unknown as EventListener);
          window.removeEventListener("pointerup", onPointerUpOrCancel);
          window.removeEventListener("pointercancel", onPointerUpOrCancel);
          canvas.removeEventListener("wheel", onWheel);
        },
      };
    };

    let ro: ResizeObserver | null = null;
    let cleanup:
      | {
          ro: ResizeObserver;
          onCameraChanged: () => void;
          camera: CesiumTypes.Camera;
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
      cleanup?.camera.changed.removeEventListener(cleanup.onCameraChanged);
      cleanup?.removeInputListeners();
      ro?.disconnect();
      viewer?.destroy();
    };
  }, [initLat, initLong]);

  return <div ref={mountRef} className="w-full h-full" />;
}

