import type * as CesiumTypes from "cesium";
import type { RefObject } from "react";

import { Globe as GlobeConsts } from "../ComponentConstants";
import * as Utils from "../Utils";

export type InstallOrbitCameraOptions = {
  Cesium: typeof import("cesium");
  viewer: CesiumTypes.Viewer;
  ellipsoid: CesiumTypes.Ellipsoid;
  radius: number;
  initLat: number;
  initLong: number;
  width: number | string;
  /**
   * When true, the camera starts at `CAMERA_INIT_SURFACE_OFFSET` above the surface instead of
   * the default far “cover the viewport” distance used for `width === "100%"` layouts.
   */
  startAtInitTargetRange?: boolean;
  containerRef: RefObject<HTMLElement | null>;
  zoomIndicatorRootRef?: RefObject<HTMLElement | null>;
  onZoomIndicatorPulse?: (x: number, y: number) => void;
  onClickLatLonDegrees?: (lat: number, lon: number) => void;
  /** Fired on pointer down, wheel, and pinch start so viewport sampling can wake before `camera.changed`. */
  onGlobeViewportInteraction?: () => void;
};

export type InstalledOrbitCameraControls = {
  /** Call on cleanup to remove all input listeners and cancel animations. */
  destroy: () => void;
  /**
   * True while the user is dragging/pinching, or a wheel-smooth-zoom / programmatic
   * rotate-or-zoom animation is in flight. Used to throttle viewport-center sampling.
   */
  isGlobeViewportSamplerBusy: () => boolean;
  /**
   * Smoothly rotate the orbit camera so the surface point at (latDeg, longDeg)
   * is centered. Does NOT change zoom (range). Any user input (drag/wheel/pinch)
   * cancels the animation immediately so it never fights the user.
   */
  animateTo: (latDeg: number, longDeg: number, durationMs?: number) => void;
  /** Set orbit angles immediately (no animation). Does NOT change zoom (range). */
  snapTo: (latDeg: number, longDeg: number) => void;
  /**
   * Smoothly zoom the camera so it ends `Globe.CAMERA_INIT_SURFACE_OFFSET` meters
   * above the globe surface. Intended to be triggered when geolocation is
   * granted/processed, while the starting camera range stays at its default.
   */
  animateZoomToInitTarget: (durationMs?: number) => void;
  /** Immediately snap zoom to the init target zoom range. */
  snapZoomToInitTarget: () => void;
};

export function installOrbitCameraControls({
  Cesium,
  viewer,
  ellipsoid,
  radius,
  initLat,
  initLong,
  width,
  startAtInitTargetRange,
  containerRef,
  zoomIndicatorRootRef,
  onZoomIndicatorPulse,
  onClickLatLonDegrees,
  onGlobeViewportInteraction,
}: InstallOrbitCameraOptions): InstalledOrbitCameraControls {
  const EPS = 1e-3;

  const notifyGlobeViewportInteraction = () => {
    try {
      onGlobeViewportInteraction?.();
    } catch {
      // ignore third-party hook failures
    }
  };

  const canvas = viewer.scene.canvas;
  canvas.style.touchAction = "none";

  // Orbital camera state (camera always looks at globe center).
  // theta: longitude-like angle around Z axis; phi: latitude-like angle from equator.
  let theta = (initLong * Math.PI) / 180;
  let phi = (initLat * Math.PI) / 180;
  let range = radius * 3.0;

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
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    const dir = unitFromAngles(theta, phi);
    const destination = Cesium.Cartesian3.multiplyByScalar(dir, range, new Cesium.Cartesian3());
    const direction = Cesium.Cartesian3.negate(dir, new Cesium.Cartesian3());
    const up = computeUp(dir);
    viewer.camera.setView({
      destination,
      orientation: { direction, up },
    });
    viewer.scene.requestRender();
  };

  // Zoom constraints: keep a minimum clearance above the surface so we never clip
  // through the ellipsoid (which can show black).
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = GlobeConsts.MIN_SURFACE_CLEARANCE_M;
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

  const clampRangeValue = (next: number) => {
    const minSurface =
      viewer.scene.screenSpaceCameraController.minimumZoomDistance ?? GlobeConsts.MIN_SURFACE_CLEARANCE_M;
    const maxSurface = viewer.scene.screenSpaceCameraController.maximumZoomDistance ?? radius * 20.0;
    const minRange = radius + minSurface;
    const maxRange = maxSurface;
    return Utils.clamp(next, minRange, maxRange);
  };

  const initTargetRange = clampRangeValue(radius + GlobeConsts.CAMERA_INIT_SURFACE_OFFSET);

  /** Full-bleed layout: zoom so the sphere’s limb subtends the larger of the two frustum FOVs (“cover”), clipping on the shorter axis (portrait: left/right). */
  const fillParent = typeof width === "string" && width === "100%";
  if (startAtInitTargetRange) {
    range = initTargetRange;
  } else if (fillParent) {
    viewer.resize();
    viewer.forceResize?.();
    const canvasEl = viewer.scene.canvas;
    const frustum = viewer.camera.frustum as unknown as {
      fovy?: number;
      aspectRatio?: number;
    };
    const fovy = frustum.fovy ?? (60 * Math.PI) / 180;
    const aspect = frustum.aspectRatio ?? canvasEl.clientWidth / Math.max(1, canvasEl.clientHeight);
    const fovx = 2 * Math.atan(Math.tan(fovy / 2) * aspect);
    const lim = Math.max(fovx, fovy);
    const minCenter = radius + GlobeConsts.MIN_SURFACE_CLEARANCE_M;
    const coverDistance = radius / Math.sin(lim / 2);
    range = Math.max(minCenter, coverDistance);
  }

  const getMinRange = () => {
    const minSurface =
      viewer.scene.screenSpaceCameraController.minimumZoomDistance ?? GlobeConsts.MIN_SURFACE_CLEARANCE_M;
    return radius + minSurface;
  };

  const closeFactor01 = () => {
    const initialRange = rangeAtInstall;
    // 1.0 at initial distance, 0.0 at (or below) min range.
    const minRange = getMinRange();
    const denom = Math.max(1, initialRange - minRange);
    return Utils.clamp((range - minRange) / denom, 0, 1);
  };

  const zoomRateScale01 = () => {
    return Math.max(GlobeConsts.ZOOM_MIN, closeFactor01() / GlobeConsts.ZOOM_DECAY_FACTOR);
  };

  const rotateSpeedMultiplier = () => {
    return Math.max(GlobeConsts.ROTATE_MIN, closeFactor01());
  };

  const setRange = (next: number) => {
    const minSurface =
      viewer.scene.screenSpaceCameraController.minimumZoomDistance ?? GlobeConsts.MIN_SURFACE_CLEARANCE_M;
    const maxSurface = viewer.scene.screenSpaceCameraController.maximumZoomDistance ?? radius * 20.0;
    const minRange = radius + minSurface;
    const maxRange = maxSurface;
    range = Utils.clamp(next, minRange, maxRange);
  };

  const rangeAtInstall = range;

  const pulseZoomIndicator = (clientX: number, clientY: number) => {
    const rect = (zoomIndicatorRootRef?.current ?? containerRef.current)?.getBoundingClientRect();
    if (!rect) return;
    onZoomIndicatorPulse?.(clientX - rect.left, clientY - rect.top);
  };

  const getSurfaceDirFromClientXY = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const pos = new Cesium.Cartesian2(clientX - rect.left, clientY - rect.top);

    // Stability over "accuracy":
    // - `pickEllipsoid` is deterministic and never jumps to buildings/labels.
    // - `globe.pick` is usually stable when ellipsoid isn't available.
    // - `pickPosition` can jump (depth buffer artifacts / picked primitives), so use last.
    let world: CesiumTypes.Cartesian3 | undefined;

    const pe = viewer.camera.pickEllipsoid(pos, ellipsoid);
    if (pe) world = pe;

    if (!world) {
      try {
        const ray = viewer.camera.getPickRay(pos);
        if (ray) {
          const gp = viewer.scene.globe.pick(ray, viewer.scene);
          if (Cesium.defined(gp)) world = gp as CesiumTypes.Cartesian3;
        }
      } catch {
        // ignore, fall back below
      }
    }

    if (!world) {
      try {
        if (viewer.scene.pickPositionSupported) {
          const pp = viewer.scene.pickPosition(pos);
          if (Cesium.defined(pp)) world = pp as CesiumTypes.Cartesian3;
        }
      } catch {
        // ignore, fall back below
      }
    }

    if (!world) return undefined;
    return Cesium.Cartesian3.normalize(world, new Cesium.Cartesian3());
  };

  type ZoomAimSession = {
    startTheta: number;
    startPhi: number;
    startRange: number;
    targetTheta: number;
    targetPhi: number;
    clientX: number;
    clientY: number;
    panOffsetTheta: number;
    panOffsetPhi: number;
  };

  let zoomAim: ZoomAimSession | null = null;

  const beginZoomAim = (clientX: number, clientY: number) => {
    const dir = getSurfaceDirFromClientXY(clientX, clientY);
    if (!dir) return;
    zoomAim = {
      startTheta: theta,
      startPhi: phi,
      startRange: range,
      targetTheta: Math.atan2(dir.y, dir.x),
      targetPhi: Math.asin(Utils.clamp(dir.z, -1, 1)),
      clientX,
      clientY,
      panOffsetTheta: 0,
      panOffsetPhi: 0,
    };
  };

  const clearZoomAim = () => {
    zoomAim = null;
  };

  const AIM_RELOCK_PX = 4;
  const ensureZoomAimForClientXY = (clientX: number, clientY: number) => {
    if (!zoomAim) return beginZoomAim(clientX, clientY);

    const dx = clientX - zoomAim.clientX;
    const dy = clientY - zoomAim.clientY;
    if (Math.hypot(dx, dy) < AIM_RELOCK_PX) return;

    const dir = getSurfaceDirFromClientXY(clientX, clientY);
    if (!dir) return;
    zoomAim = {
      startTheta: theta,
      startPhi: phi,
      startRange: range,
      targetTheta: Math.atan2(dir.y, dir.x),
      targetPhi: Math.asin(Utils.clamp(dir.z, -1, 1)),
      clientX,
      clientY,
      panOffsetTheta: 0,
      panOffsetPhi: 0,
    };
  };

  const applyZoomAimIfActive = () => {
    if (!zoomAim) return;
    const minRange = getMinRange();
    const denom = Math.max(1e-6, zoomAim.startRange - minRange);
    const f = Utils.clamp((zoomAim.startRange - range) / denom, 0, 1);
    const fs = f * f * (3 - 2 * f);
    theta = Utils.lerpAngleRad(zoomAim.startTheta, zoomAim.targetTheta, fs) + zoomAim.panOffsetTheta;
    phi = Utils.clamp(
      Utils.lerp(zoomAim.startPhi, zoomAim.targetPhi, fs) + zoomAim.panOffsetPhi,
      -Math.PI / 2 + EPS,
      Math.PI / 2 - EPS,
    );
  };

  const zoomBy = (scale: number) => {
    setRange(range * scale);
    applyZoomAimIfActive();
    applyOrbit();
  };

  type PointerState = { x: number; y: number; t: number; vx: number; vy: number };
  const pointers = new Map<number, PointerState>();
  const pointerDownMeta = new Map<number, { x: number; y: number; t: number; button?: number }>();
  let mode: "none" | "rotate" | "zoomDrag" | "pinchZoom" = "none";

  const applyDragRotate = (dx: number, dy: number, target: { panOffsetTheta: number; panOffsetPhi: number }) => {
    if (dx === 0 && dy === 0) return;
    const frustum = viewer.camera.frustum as unknown as { fovy?: number; aspectRatio?: number };
    const fovy = frustum.fovy ?? (60 * Math.PI) / 180;
    const aspect = frustum.aspectRatio ?? canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const fovx = 2 * Math.atan(Math.tan(fovy / 2) * aspect);
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    const fxPx = (w / 2) / Math.tan(fovx / 2);
    const fyPx = (h / 2) / Math.tan(fovy / 2);
    const dTheta = (dx * range) / (Math.max(1, fxPx) * radius);
    const dPhi = (dy * range) / (Math.max(1, fyPx) * radius);
    const mult = rotateSpeedMultiplier();
    target.panOffsetTheta -= dTheta * mult;
    target.panOffsetPhi += dPhi * mult;
  };

  type PinchZoomSession = {
    ids: [number, number];
    lastUpdateT: number;
  };
  let pinchZoomSession: PinchZoomSession | null = null;

  const endPinchZoomSession = () => {
    pinchZoomSession = null;
  };

  // Cesium-native pinch events provide both touch points in the same callback.
  // This avoids the common "one finger updates late then snaps" behavior you can get
  // when deriving pinch deltas from independent pointermove streams.
  const cesiumGestureHandler = new Cesium.ScreenSpaceEventHandler(canvas);
  const canvasToClient = (p: { x: number; y: number }) => {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + p.x, y: rect.top + p.y };
  };

  // Simplified pinch state (modeled after common Cesium examples):
  // - PINCH_START enables pinch mode
  // - PINCH_MOVE computes a single distance delta and zooms
  // - PINCH_END disables pinch mode
  let isPinching = false;
  let pinchLastDist: number | null = null;

  const readCesiumPinchDelta = (ev: unknown): { dDist: number; distNow?: number } | null => {
    const e = ev as {
      distance?: {
        startDistance?: number;
        currentDistance?: number;
        startPosition?: { x: number; y: number };
        endPosition?: { x: number; y: number };
      };
    };

    // Preferred: direct delta, as in the user's snippet.
    if (typeof e.distance?.currentDistance === "number" && typeof e.distance?.startDistance === "number") {
      return { dDist: e.distance.currentDistance - e.distance.startDistance, distNow: e.distance.currentDistance };
    }

    // Cesium ScreenSpaceEventHandler encodes distance deltas in the y component of MotionEvent positions.
    const endY = e.distance?.endPosition?.y;
    const startY = e.distance?.startPosition?.y;
    if (typeof endY === "number" && typeof startY === "number") {
      return { dDist: endY - startY, distNow: endY };
    }

    // Fallback: only a single distance value is available; caller will use lastDist.
    if (typeof e.distance?.currentDistance === "number") return { dDist: 0, distNow: e.distance.currentDistance };
    if (typeof e.distance?.endPosition?.y === "number") return { dDist: 0, distNow: e.distance.endPosition.y };
    return null;
  };

  cesiumGestureHandler.setInputAction(
    (e: { position1: { x: number; y: number }; position2: { x: number; y: number } }) => {
      notifyGlobeViewportInteraction();
      isPinching = true;
      const mid = { x: (e.position1.x + e.position2.x) / 2, y: (e.position1.y + e.position2.y) / 2 };
      const midClient = canvasToClient(mid);
      // Cesium's internal pinch distance is scaled by 0.25 in many builds.
      const dist = 0.25 * Math.max(0, Math.hypot(e.position1.x - e.position2.x, e.position1.y - e.position2.y));
      pinchLastDist = dist;

      clearZoomAim();
      beginZoomAim(midClient.x, midClient.y);
      if (!zoomAim) return;

      // Lock to the current two pointer IDs so we can reuse the existing velocity-based
      // pinch-drag rotation logic (max-magnitude finger, epsilon, recent-ness).
      const idsNow = Array.from(pointers.keys()).sort((x, y) => x - y);
      const ids = (idsNow.length >= 2 ? ([idsNow[0], idsNow[1]] as [number, number]) : ([-1, -1] as [number, number]));
      const a = pointers.get(ids[0]);
      const b = pointers.get(ids[1]);

      pinchZoomSession = {
        ids,
        lastUpdateT: Math.max(a?.t ?? 0, b?.t ?? 0),
      };
      mode = "pinchZoom";
    },
    Cesium.ScreenSpaceEventType.PINCH_START,
  );

  cesiumGestureHandler.setInputAction(
    ((e: unknown) => {
      if (!isPinching || !zoomAim) return;

      const delta = readCesiumPinchDelta(e);
      if (!delta) return;

      let dDist = delta.dDist;
      if (dDist === 0 && typeof delta.distNow === "number") {
        const prev = pinchLastDist ?? delta.distNow;
        pinchLastDist = delta.distNow;
        dDist = delta.distNow - prev;
      } else if (typeof delta.distNow === "number") {
        pinchLastDist = delta.distNow;
      }

      // Swap pinch in/out: decreasing distance zooms OUT, increasing distance zooms IN.
      // Make pinch 9x as sensitive as wheel-equivalent input.
      const PINCH_SENS = 18.0;
      const z = Math.max(GlobeConsts.ZOOM_MIN, closeFactor01());
      const scale = Math.exp(-dDist * GlobeConsts.ZOOM_SENS * z * 0.15 * PINCH_SENS);
      if (scale < 1) pulseZoomIndicator(zoomAim.clientX, zoomAim.clientY);
      zoomBy(scale);

      // Reintroduce pinch-drag rotation (both axes) using the original velocity logic:
      // - horizontal rotate when both fingers move same-x sign OR only one finger is active
      // - vertical "panning" behavior matches prior dy handling
      if (pinchZoomSession) {
        const a = pointers.get(pinchZoomSession.ids[0]);
        const b = pointers.get(pinchZoomSession.ids[1]);
        if (a && b) {
          const tNow = Math.max(a.t, b.t);
          const dtMs = Math.max(0, tNow - pinchZoomSession.lastUpdateT);
          pinchZoomSession.lastUpdateT = tNow;

          const V_EPS = 0.02;
          const vxA = a.vx;
          const vxB = b.vx;
          const vyA = a.vy;
          const vyB = b.vy;

          const absVxA = Math.abs(vxA);
          const absVxB = Math.abs(vxB);
          const absVyA = Math.abs(vyA);
          const absVyB = Math.abs(vyB);

          const RECENT_MS = 60;
          const aRecent = tNow - a.t <= RECENT_MS;
          const bRecent = tNow - b.t <= RECENT_MS;

          const aXActive = absVxA > V_EPS && aRecent;
          const bXActive = absVxB > V_EPS && bRecent;
          const aYActive = absVyA > V_EPS && aRecent;
          const bYActive = absVyB > V_EPS && bRecent;

          const oppositeX =
            aXActive &&
            bXActive &&
            Math.sign(vxA) !== 0 &&
            Math.sign(vxB) !== 0 &&
            Math.sign(vxA) !== Math.sign(vxB);
          const oppositeY =
            aYActive &&
            bYActive &&
            Math.sign(vyA) !== 0 &&
            Math.sign(vyB) !== 0 &&
            Math.sign(vyA) !== Math.sign(vyB);

          if (dtMs > 0) {
            let vxUse = 0;
            if (!oppositeX) {
              // Use maximum magnitude when both contribute; otherwise accept the active finger.
              if (aXActive && bXActive) vxUse = absVxA >= absVxB ? vxA : vxB;
              else if (aXActive) vxUse = vxA;
              else if (bXActive) vxUse = vxB;
            }

            let vyUse = 0;
            if (!oppositeY) {
              if (aYActive && bYActive) vyUse = absVyA >= absVyB ? vyA : vyB;
              else if (aYActive) vyUse = vyA;
              else if (bYActive) vyUse = vyB;
            }

            if (vxUse !== 0 || vyUse !== 0) {
              const dx = vxUse * dtMs;
              const dy = vyUse * dtMs;
              applyDragRotate(dx, dy, zoomAim);
              applyZoomAimIfActive();
              applyOrbit();
            }
          }
        }
      }
    }) as unknown as CesiumTypes.ScreenSpaceEventHandler.TwoPointMotionEventCallback,
    Cesium.ScreenSpaceEventType.PINCH_MOVE,
  );

  cesiumGestureHandler.setInputAction(() => {
    isPinching = false;
    pinchLastDist = null;
    endPinchZoomSession();
    clearZoomAim();
    if (pointers.size === 1) mode = "rotate";
    else if (pointers.size === 0) mode = "none";
  }, Cesium.ScreenSpaceEventType.PINCH_END);

  // Click/tap heuristics.
  const CLICK_MAX_MS = 450;
  const CLICK_MAX_MOVE_PX = 6;

  let wheelZoomTargetRange = range;
  let wheelZoomLastClient: { x: number; y: number } | null = null;
  let wheelZoomRaf: number | null = null;
  let wheelZoomLastT = 0;
  let wheelZoomLastPulseT = 0;
  let wheelZoomLerpRate = 18; // higher = faster convergence

  // Programmatic orbit-rotation animation (used by `animateTo`). Rotates `theta`/`phi`
  // toward a target without touching `range`. Always cancellable by user input.
  let rotateAnimRaf: number | null = null;
  const cancelRotateAnim = () => {
    if (rotateAnimRaf != null) {
      cancelAnimationFrame(rotateAnimRaf);
      rotateAnimRaf = null;
    }
  };

  const animateTo = (latDeg: number, longDeg: number, durationMs = 1500) => {
    cancelRotateAnim();
    // A pending zoom-aim would re-target the camera mid-animation; clear it.
    clearZoomAim();

    const targetTheta = (longDeg * Math.PI) / 180;
    const targetPhi = Utils.clamp(
      (latDeg * Math.PI) / 180,
      -Math.PI / 2 + EPS,
      Math.PI / 2 - EPS,
    );
    const startTheta = theta;
    const startPhi = phi;
    // Take the shortest way around the sphere (e.g. -179° → +179° rotates 2°, not 358°).
    const dTheta = Utils.wrapAngleRad(targetTheta - startTheta);
    const dPhi = targetPhi - startPhi;

    if (Math.abs(dTheta) < 1e-6 && Math.abs(dPhi) < 1e-6) return;

    const startT =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const dur = Math.max(1, durationMs);

    const tick = (now: number) => {
      const u = Utils.clamp((now - startT) / dur, 0, 1);
      // smoothstep ease-in/out
      const e = u * u * (3 - 2 * u);
      theta = startTheta + dTheta * e;
      phi = Utils.clamp(
        startPhi + dPhi * e,
        -Math.PI / 2 + EPS,
        Math.PI / 2 - EPS,
      );
      applyOrbit();
      if (u < 1) {
        rotateAnimRaf = requestAnimationFrame(tick);
      } else {
        rotateAnimRaf = null;
      }
    };
    rotateAnimRaf = requestAnimationFrame(tick);
  };

  const snapTo = (latDeg: number, longDeg: number) => {
    cancelRotateAnim();
    clearZoomAim();
    theta = (longDeg * Math.PI) / 180;
    phi = Utils.clamp(
      (latDeg * Math.PI) / 180,
      -Math.PI / 2 + EPS,
      Math.PI / 2 - EPS,
    );
    applyOrbit();
  };

  const startWheelZoomLoop = () => {
    if (wheelZoomRaf != null) return;
    wheelZoomLastT = performance.now();

    const tick = (tNow: number) => {
      const dt = Math.min(0.05, Math.max(0, (tNow - wheelZoomLastT) / 1000));
      wheelZoomLastT = tNow;

      const remaining = Math.abs(wheelZoomTargetRange - range);
      if (remaining < 0.01) {
        if (zoomAim && Math.abs(range - zoomAim.startRange) < 0.5) clearZoomAim();
        wheelZoomRaf = null;
        wheelZoomLerpRate = 18;
        return;
      }

      const alpha = 1 - Math.exp(-dt * wheelZoomLerpRate);
      const prevRange = range;
      const nextRange = Utils.lerp(range, wheelZoomTargetRange, alpha);
      setRange(nextRange);

      const zoomingIn = wheelZoomTargetRange < prevRange - 1e-6;

      if (wheelZoomLastClient && zoomingIn && tNow - wheelZoomLastPulseT > 60) {
        wheelZoomLastPulseT = tNow;
        pulseZoomIndicator(wheelZoomLastClient.x, wheelZoomLastClient.y);
      }

      applyZoomAimIfActive();
      applyOrbit();

      wheelZoomRaf = requestAnimationFrame(tick);
    };

    wheelZoomRaf = requestAnimationFrame(tick);
  };

  const onContextMenu = (e: Event) => e.preventDefault();
  const onDoubleClick = (e: MouseEvent) => {
    e.preventDefault();
  };

  const onPointerDown = (e: PointerEvent) => {
    // Any user touch/click cancels a programmatic rotation animation.
    cancelRotateAnim();

    notifyGlobeViewportInteraction();

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp, vx: 0, vy: 0 });
    pointerDownMeta.set(e.pointerId, { x: e.clientX, y: e.clientY, t: Date.now(), button: e.button });

    if (e.pointerType === "mouse") {
      if (e.button === 2) {
        // If a smooth wheel-zoom is in-flight, it will keep lerping `range` toward its
        // previous target and "snap back" against right-drag zoom. Right-drag must win.
        if (wheelZoomRaf != null) {
          cancelAnimationFrame(wheelZoomRaf);
          wheelZoomRaf = null;
          wheelZoomLastClient = null;
        }
        wheelZoomTargetRange = range;
        mode = "zoomDrag";
        clearZoomAim();
        beginZoomAim(e.clientX, e.clientY);
      } else if (e.button === 0) {
        mode = "rotate";
        // Do NOT clear zoom aim or cancel any active zoom loop:
        // rotation must remain responsive even while zooming is in progress.
      }
    } else {
      if (pointers.size === 1) {
        mode = "rotate";
        // Same as mouse: allow rotate concurrently with active zoom.
      }
      if (pointers.size === 2) {
        if (wheelZoomRaf != null) {
          cancelAnimationFrame(wheelZoomRaf);
          wheelZoomRaf = null;
          wheelZoomTargetRange = range;
          wheelZoomLastClient = null;
        }
        // Let Cesium's pinch recognizer drive pinch start/move/end so we always receive
        // both touch points together (more reliable than independent pointermove streams).
        mode = "pinchZoom";
      }
    }

    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const dtRaw = e.timeStamp - prev.t;
    const dt = dtRaw > 0 ? dtRaw : 0;
    const dxRaw = e.clientX - prev.x;
    const dyRaw = e.clientY - prev.y;
    const dtForVel = Math.max(4, dt);
    const vx = Utils.clamp(dxRaw / dtForVel, -3, 3);
    const vy = Utils.clamp(dyRaw / dtForVel, -3, 3);
    const next: PointerState = {
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
      vx,
      vy,
    };
    pointers.set(e.pointerId, next);

    if (mode === "rotate") {
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      // If a zoom aim is active (wheel/pinch/zoom-drag), rotate via its pan offsets
      // so the zoom loop doesn't overwrite the user's rotation.
      if (zoomAim) {
        applyDragRotate(dx, dy, zoomAim);
        applyZoomAimIfActive();
        applyOrbit();
      } else {
        const temp = { panOffsetTheta: 0, panOffsetPhi: 0 };
        applyDragRotate(dx, dy, temp);
        theta = Utils.wrapAngleRad(theta + temp.panOffsetTheta);
        phi = Utils.clamp(phi + temp.panOffsetPhi, -Math.PI / 2 + EPS, Math.PI / 2 - EPS);
        applyOrbit();
      }
      e.preventDefault();
      return;
    }

    if (mode === "zoomDrag") {
      const dy = next.y - prev.y;
      const z = zoomRateScale01();
      const scale = Math.exp(dy * GlobeConsts.ZOOM_SENS * z * 0.5);
      if (scale < 1) {
        // Lock the zoom target for the entire right-drag session (like wheel/pinch).
        // Do not re-lock to the moving cursor position.
        if (zoomAim) pulseZoomIndicator(zoomAim.clientX, zoomAim.clientY);
      }
      zoomBy(scale);
      // Keep the smooth-zoom target in sync so nothing snaps back on release.
      wheelZoomTargetRange = range;
      e.preventDefault();
      return;
    }

    if (mode === "pinchZoom") {
      // Pinch is processed in a RAF loop so both pointers are sampled together.
      e.preventDefault();
    }
  };

  const onPointerUpOrCancel = (e: PointerEvent) => {
    const down = pointerDownMeta.get(e.pointerId);
    pointers.delete(e.pointerId);
    pointerDownMeta.delete(e.pointerId);

    if (down) {
      const dt = Date.now() - down.t;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      const dist = Math.hypot(dx, dy);

      const isMouseLeftClick = e.pointerType === "mouse" && (down.button ?? e.button) === 0;
      const isTouchTap = e.pointerType !== "mouse";
      const isClickCandidate =
        (isMouseLeftClick || isTouchTap) &&
        dt < CLICK_MAX_MS &&
        dist < CLICK_MAX_MOVE_PX &&
        mode !== "pinchZoom" &&
        mode !== "zoomDrag";

      if (isClickCandidate) {
        const rect = canvas.getBoundingClientRect();
        const pos = new Cesium.Cartesian2(e.clientX - rect.left, e.clientY - rect.top);
        let carto: CesiumTypes.Cartographic | undefined;

        try {
          if (viewer.scene.pickPositionSupported) {
            const world = viewer.scene.pickPosition(pos);
            if (Cesium.defined(world)) {
              carto = Cesium.Cartographic.fromCartesian(world as CesiumTypes.Cartesian3, ellipsoid);
            }
          }
        } catch {
          // ignore, fall back below
        }

        if (!carto) {
          try {
            const ray = viewer.camera.getPickRay(pos);
            if (ray) {
              const gp = viewer.scene.globe.pick(ray, viewer.scene);
              if (Cesium.defined(gp)) {
                carto = Cesium.Cartographic.fromCartesian(gp as CesiumTypes.Cartesian3, ellipsoid);
              }
            }
          } catch {
            // ignore, fall back below
          }
        }

        if (!carto) {
          const world = viewer.camera.pickEllipsoid(pos, ellipsoid);
          if (world) {
            carto = Cesium.Cartographic.fromCartesian(world, ellipsoid);
          }
        }

        if (carto) {
          const lat = Cesium.Math.toDegrees(carto.latitude);
          const lon = Cesium.Math.toDegrees(carto.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            onClickLatLonDegrees?.(lat, lon);
          }
        }
      }
    }

    if (pointers.size === 0) {
      if (mode === "pinchZoom" || mode === "zoomDrag") clearZoomAim();
      mode = "none";
      endPinchZoomSession();
    } else if (pointers.size === 1 && e.pointerType !== "mouse") {
      mode = "rotate";
      endPinchZoomSession();
      clearZoomAim();
    } else if (mode === "pinchZoom" && pointers.size >= 2) {
      // Keep the pinch session locked to the original two pointers; if either is replaced
      // (e.g. one finger lifts and another lands), end the session and wait for a fresh start.
      if (pinchZoomSession) {
        const idsNow = Array.from(pointers.keys()).sort((x, y) => x - y) as [number, number];
        const stillSame =
          (idsNow[0] === pinchZoomSession.ids[0] && idsNow[1] === pinchZoomSession.ids[1]) ||
          (idsNow[0] === pinchZoomSession.ids[1] && idsNow[1] === pinchZoomSession.ids[0]);
        if (!stillSame) {
          endPinchZoomSession();
          clearZoomAim();
          mode = "none";
        }
      }
    }

    e.preventDefault();
  };

  const onWheel = (e: WheelEvent) => {
    // Any user wheel input cancels a programmatic rotation animation.
    cancelRotateAnim();

    notifyGlobeViewportInteraction();

    const z = zoomRateScale01();
    const scale = Math.exp(e.deltaY * GlobeConsts.ZOOM_SENS * z * 0.55);
    // Base the next target on the *current* camera range.
    // If we compound off the previous target while a smooth-zoom RAF is still catching up,
    // a small burst of wheel events (common on Windows mice / high-res wheels) can push the
    // target far past the user's intent, and the RAF loop will keep zooming ("stuck" over-zoom).
    wheelZoomTargetRange = clampRangeValue(range * scale);
    wheelZoomLastClient = { x: e.clientX, y: e.clientY };
    pulseZoomIndicator(e.clientX, e.clientY);
    wheelZoomLastPulseT = performance.now();
    if (scale < 1) {
      ensureZoomAimForClientXY(e.clientX, e.clientY);
    }
    startWheelZoomLoop();
    e.preventDefault();
  };

  canvas.addEventListener("contextmenu", onContextMenu);
  canvas.addEventListener("dblclick", onDoubleClick);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUpOrCancel);
  canvas.addEventListener("pointercancel", onPointerUpOrCancel);
  canvas.addEventListener("lostpointercapture", onPointerUpOrCancel as unknown as EventListener);
  window.addEventListener("pointerup", onPointerUpOrCancel);
  window.addEventListener("pointercancel", onPointerUpOrCancel);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  applyOrbit();

  const isGlobeViewportSamplerBusy = () =>
    pointers.size > 0 || wheelZoomRaf !== null || rotateAnimRaf !== null;

  return {
    isGlobeViewportSamplerBusy,
    animateTo,
    snapTo,
    animateZoomToInitTarget: (durationMs?: number) => {
      // Reuse the existing smooth wheel-zoom target codepath.
      // If a duration is supplied, tune the exponential rate so we reach ~99% by that time.
      if (typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs > 0) {
        const durS = Math.max(0.001, durationMs / 1000);
        // remaining(T) = exp(-rate*T). Solve for remaining=0.01 at T=durS.
        wheelZoomLerpRate = 4.605170186 / durS;
      } else {
        wheelZoomLerpRate = 18;
      }
      clearZoomAim();
      wheelZoomLastClient = null;
      wheelZoomTargetRange = initTargetRange;
      startWheelZoomLoop();
    },
    snapZoomToInitTarget: () => {
      if (wheelZoomRaf != null) {
        cancelAnimationFrame(wheelZoomRaf);
        wheelZoomRaf = null;
        wheelZoomLastClient = null;
      }
      clearZoomAim();
      setRange(initTargetRange);
      wheelZoomTargetRange = initTargetRange;
      applyOrbit();
    },
    destroy: () => {
      cancelRotateAnim();
      if (wheelZoomRaf != null) {
        cancelAnimationFrame(wheelZoomRaf);
        wheelZoomRaf = null;
      }
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUpOrCancel);
      canvas.removeEventListener("pointercancel", onPointerUpOrCancel);
      canvas.removeEventListener("lostpointercapture", onPointerUpOrCancel as unknown as EventListener);
      window.removeEventListener("pointerup", onPointerUpOrCancel);
      window.removeEventListener("pointercancel", onPointerUpOrCancel);
      canvas.removeEventListener("wheel", onWheel);
      try {
        cesiumGestureHandler.destroy();
      } catch {
        // ignore
      }
      clearZoomAim();
      endPinchZoomSession();
      pointers.clear();
      pointerDownMeta.clear();
    },
  };
}

