import type * as CesiumTypes from "cesium";
import type { RefObject } from "react";

import { Globe as GlobeConsts } from "../ComponentConstants";
import * as Utils from "../Utils";
import * as OrbitCam from "../pure/globe/OrbitCamera";
import { isGlobeViewportPointerIdle } from "../pure/globe/GlobeViewportPointerIdle";
import {
  isGlobeViewportSamplerBusy as isGlobeViewportSamplerBusyState,
  shouldContinueGlobeViewportCenterSampling,
} from "../pure/globe/GlobeViewportSamplerState";

export type InstallOrbitCameraOptions = {
  Cesium: typeof import("cesium");
  viewer: CesiumTypes.Viewer;
  ellipsoid: CesiumTypes.Ellipsoid;
  radius: number;
  initLat: number;
  initLong: number;
  width: number | string;
  /** Meters above the globe surface for the post-geolocation init zoom target. */
  cameraInitSurfaceOffsetM: number;
  /**
   * When true, the camera starts at `cameraInitSurfaceOffsetM` above the surface instead of
   * the default far “cover the viewport” distance used for `width === "100%"` layouts.
   */
  startAtInitTargetRange?: boolean;
  containerRef: RefObject<HTMLElement | null>;
  zoomIndicatorRootRef?: RefObject<HTMLElement | null>;
  onZoomIndicatorPulse?: (x: number, y: number) => void;
  onClickLatLonDegrees?: (lat: number, lon: number) => void;
  /** Fired on pointer down, wheel, and pinch start so viewport sampling can wake before `camera.changed`. */
  onGlobeViewportInteraction?: () => void;
  /**
   * When false, pointer/wheel/pinch orbit input is ignored (still allow pointerup/cancel for hygiene).
   * Used while post-geolocation camera animations run.
   */
  isUserGlobeOrbitInputAllowed?: () => boolean;
  /**
   * Fired when a programmatic `animateTo` rotation finishes (including the no-op case where
   * the camera is already at the target).
   */
  onOrbitRotateAnimationEnd?: () => void;
  /**
   * Fired when all sampler-relevant camera motion has stopped (user input and programmatic
   * rotate/zoom animations). Not fired while any motion is still in flight.
   */
  onCameraMotionSettled?: () => void;
};

export type InstalledOrbitCameraControls = {
  /** Call on cleanup to remove all input listeners and cancel animations. */
  destroy: () => void;
  /**
   * True while the user is dragging/pinching, or a wheel-smooth-zoom / programmatic
   * rotate-or-zoom animation is in flight.
   */
  isGlobeViewportSamplerBusy: () => boolean;
  /** True while at least one pointer is currently down on the globe canvas. */
  isGlobePointerInputActive: () => boolean;
  /**
   * True when no pointers are down and {@link GlobeConsts.VIEWPORT_DETECT_IDLE_MS}
   * has elapsed since the last pointer or wheel input.
   */
  isGlobeViewportPointerIdle: (idleThresholdMs: number, nowMs?: number) => boolean;
  /**
   * True while viewport-center sampling should continue: active user pointer input, or
   * user wheel-smoothing after the last wheel tick. Programmatic recenter/geolocation
   * animations do not count (see GlobeViewport spec).
   */
  shouldContinueViewportCenterSampling: () => boolean;
  /**
   * Smoothly rotate the orbit camera so the surface point at (latDeg, longDeg)
   * is centered. Does NOT change zoom (range). Any user input (drag/wheel/pinch)
   * cancels the animation immediately so it never fights the user.
   */
  animateTo: (latDeg: number, longDeg: number, durationMs?: number) => void;
  /** Set orbit angles immediately (no animation). Does NOT change zoom (range). */
  snapTo: (latDeg: number, longDeg: number) => void;
  /**
   * Smoothly zoom the camera so it ends `cameraInitSurfaceOffsetM` meters
   * above the globe surface. Intended to be triggered when geolocation is
   * granted/processed, while the starting camera range stays at its default.
   */
  animateZoomToInitTarget: (durationMs?: number) => void;
  /** Immediately snap zoom to the init target zoom range. */
  snapZoomToInitTarget: () => void;
  /** Smoothly zoom to a camera height above the ellipsoid (meters). */
  animateZoomToCameraHeightM: (heightM: number, durationMs?: number) => void;
  /** Immediately snap zoom to a camera height above the ellipsoid (meters). */
  snapZoomToCameraHeightM: (heightM: number) => void;
  /** Current orbit center distance in meters (matches interactive zoom level). */
  getOrbitCenterDistanceM: () => number;
  /** Smoothly zoom to an orbit center distance in meters. */
  animateZoomToOrbitCenterDistanceM: (
    centerDistanceM: number,
    durationMs?: number,
  ) => void;
  /** Immediately snap zoom to an orbit center distance in meters. */
  snapZoomToOrbitCenterDistanceM: (centerDistanceM: number) => void;
  /** Updates the init zoom target when user settings change at runtime. */
  setCameraInitSurfaceOffsetM: (offsetM: number) => void;
};

export function installOrbitCameraControls({
  Cesium,
  viewer,
  ellipsoid,
  radius,
  initLat,
  initLong,
  width,
  cameraInitSurfaceOffsetM: initialCameraInitSurfaceOffsetM,
  startAtInitTargetRange,
  containerRef,
  zoomIndicatorRootRef,
  onZoomIndicatorPulse,
  onClickLatLonDegrees,
  onGlobeViewportInteraction,
  isUserGlobeOrbitInputAllowed,
  onOrbitRotateAnimationEnd,
  onCameraMotionSettled,
}: InstallOrbitCameraOptions): InstalledOrbitCameraControls {
  const EPS = 1e-3;

  const allowUserOrbitInput = isUserGlobeOrbitInputAllowed ?? (() => true);

  let lastPointerInputMs =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const recordPointerInput = () => {
    lastPointerInputMs =
      typeof performance !== "undefined" ? performance.now() : Date.now();
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
  let theta = OrbitCam.degreesToRadians(initLong);
  let phi = OrbitCam.degreesToRadians(initLat);
  let range: number;

  const unitFromAngles = (t: number, p: number) => {
    const v = OrbitCam.orbitUnitDirectionFromAngles(t, p);
    return new Cesium.Cartesian3(v.x, v.y, v.z);
  };

  const computeUp = (dirFromCenter: CesiumTypes.Cartesian3) => {
    const v = OrbitCam.globeOrbitCameraUpWorldFromDir({
      x: dirFromCenter.x,
      y: dirFromCenter.y,
      z: dirFromCenter.z,
    });
    return new Cesium.Cartesian3(v.x, v.y, v.z);
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

  let cameraInitSurfaceOffsetM = initialCameraInitSurfaceOffsetM;

  const computeInitTargetRange = () =>
    OrbitCam.clampOrbitCenterDistanceMeters({
      centerDistanceM: radius + cameraInitSurfaceOffsetM,
      sphereRadiusM: radius,
      minSurfaceClearanceM:
        viewer.scene.screenSpaceCameraController.minimumZoomDistance ?? GlobeConsts.MIN_SURFACE_CLEARANCE_M,
      maxOrbitCenterDistanceM:
        viewer.scene.screenSpaceCameraController.maximumZoomDistance ?? radius * 20.0,
    });

  let initTargetRange = computeInitTargetRange();

  const computeRangeFromCameraHeightM = (heightM: number) =>
    OrbitCam.clampOrbitCenterDistanceMeters({
      centerDistanceM: radius + heightM,
      sphereRadiusM: radius,
      minSurfaceClearanceM:
        viewer.scene.screenSpaceCameraController.minimumZoomDistance ??
        GlobeConsts.MIN_SURFACE_CLEARANCE_M,
      maxOrbitCenterDistanceM:
        viewer.scene.screenSpaceCameraController.maximumZoomDistance ?? radius * 20.0,
    });

  /** Distinguishes user wheel smoothing from programmatic zoom animations (same RAF loop). */
  let wheelZoomFromUserInput = false;

  const animateZoomToRange = (targetRange: number, durationMs?: number) => {
    wheelZoomFromUserInput = false;
    if (typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs > 0) {
      const durS = Math.max(0.001, durationMs / 1000);
      wheelZoomLerpRate = OrbitCam.wheelZoomLerpRateForApprox99PercentInDuration(durS);
    } else {
      wheelZoomLerpRate = defaultWheelZoomLerpRate;
    }
    clearZoomAim();
    wheelZoomLastClient = null;
    wheelZoomTargetRange = targetRange;
    startWheelZoomLoop();
  };

  /** Full-bleed layout: zoom so the sphere’s limb subtends the larger of the two frustum FOVs (“cover”), clipping on the shorter axis (portrait: left/right). */
  const fillParent = typeof width === "string" && width === "100%";

  let coverOrbitDistanceM: number | null = null;
  if (fillParent) {
    viewer.resize();
    viewer.forceResize?.();
    const canvasEl = viewer.scene.canvas;
    const frustum = viewer.camera.frustum as unknown as {
      fovy?: number;
      aspectRatio?: number;
    };
    const fovy = frustum.fovy ?? (60 * Math.PI) / 180;
    const aspect = frustum.aspectRatio ?? canvasEl.clientWidth / Math.max(1, canvasEl.clientHeight);
    const minCenter = radius + GlobeConsts.MIN_SURFACE_CLEARANCE_M;
    coverOrbitDistanceM = OrbitCam.sphereCoverOrbitDistanceMeters({
      sphereRadiusM: radius,
      minCenterDistanceM: minCenter,
      fovyRad: fovy,
      aspect,
    });
  }

  /**
   * Upper reference for zoom + orbit-drag damping (`zoomRateScale01`). For full-bleed layouts this is
   * **always** the same “cover viewport” orbit radius, even when `startAtInitTargetRange` starts the
   * camera at the user-configured init surface offset. That keeps reload-with-geolocation sensitivity aligned
   * with the pre-permission session (far framing), instead of a tiny `(baseline − minRange)` band near
   * the surface.
   */
  const { rangeM, zoomCurveReferenceRangeM } = OrbitCam.initialOrbitRangeAndZoomReference({
    fillParent,
    coverOrbitDistanceM,
    sphereRadiusM: radius,
    minSurfaceClearanceM:
      viewer.scene.screenSpaceCameraController.minimumZoomDistance ?? GlobeConsts.MIN_SURFACE_CLEARANCE_M,
    maxOrbitCenterDistanceM:
      viewer.scene.screenSpaceCameraController.maximumZoomDistance ?? radius * 20.0,
    cameraInitSurfaceOffsetM,
    startAtInitTargetRange,
  });
  range = rangeM;
  const zoomCurveReferenceRange = zoomCurveReferenceRangeM;

  const getMinRange = () => {
    const minSurface =
      viewer.scene.screenSpaceCameraController.minimumZoomDistance ?? GlobeConsts.MIN_SURFACE_CLEARANCE_M;
    return radius + minSurface;
  };

  /** Normalized distance along zoom track (1 = cover framing, 0 = min orbit). Shared by zoom + orbit drag. */
  const zoomCurveFactor01 = () => {
    const minRange = getMinRange();
    return OrbitCam.zoomCurveFactor01(range, minRange, zoomCurveReferenceRange);
  };

  const zoomRateScale01 = () => {
    return OrbitCam.zoomRateScale01(
      zoomCurveFactor01(),
      GlobeConsts.ZOOM_MIN,
      GlobeConsts.ZOOM_DECAY_FACTOR,
    );
  };

  /** Left-drag / touch orbit: same damping curve as wheel and right-drag zoom (via `zoomCurveReferenceRange`). */
  const rotateSpeedMultiplier = () => zoomRateScale01();

  const clampOrbitCenterDistanceM = (centerDistanceM: number) =>
    OrbitCam.clampOrbitCenterDistanceMeters({
      centerDistanceM,
      sphereRadiusM: radius,
      minSurfaceClearanceM:
        viewer.scene.screenSpaceCameraController.minimumZoomDistance ??
        GlobeConsts.MIN_SURFACE_CLEARANCE_M,
      maxOrbitCenterDistanceM:
        viewer.scene.screenSpaceCameraController.maximumZoomDistance ?? radius * 20.0,
    });

  const setRange = (next: number) => {
    range = clampOrbitCenterDistanceM(next);
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
    const tp = OrbitCam.sphericalDirToThetaPhi({ x: dir.x, y: dir.y, z: dir.z });
    zoomAim = {
      startTheta: theta,
      startPhi: phi,
      startRange: range,
      targetTheta: tp.theta,
      targetPhi: tp.phi,
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
    if (!OrbitCam.shouldRelockZoomAim(dx, dy, AIM_RELOCK_PX)) return;

    const dir = getSurfaceDirFromClientXY(clientX, clientY);
    if (!dir) return;
    const tp2 = OrbitCam.sphericalDirToThetaPhi({ x: dir.x, y: dir.y, z: dir.z });
    zoomAim = {
      startTheta: theta,
      startPhi: phi,
      startRange: range,
      targetTheta: tp2.theta,
      targetPhi: tp2.phi,
      clientX,
      clientY,
      panOffsetTheta: 0,
      panOffsetPhi: 0,
    };
  };

  const applyZoomAimIfActive = () => {
    if (!zoomAim) return;
    const minRange = getMinRange();
    const merged = OrbitCam.zoomAimMergedOrbitAngles({
      startTheta: zoomAim.startTheta,
      startPhi: zoomAim.startPhi,
      targetTheta: zoomAim.targetTheta,
      targetPhi: zoomAim.targetPhi,
      startRange: zoomAim.startRange,
      range,
      minRange,
      panOffsetTheta: zoomAim.panOffsetTheta,
      panOffsetPhi: zoomAim.panOffsetPhi,
      latEps: EPS,
    });
    theta = merged.theta;
    phi = merged.phi;
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
    const { dTheta, dPhi } = OrbitCam.orbitPanDeltaRadians({
      dxPx: dx,
      dyPx: dy,
      rangeM: range,
      sphereRadiusM: radius,
      canvasWidthPx: canvas.clientWidth,
      canvasHeightPx: canvas.clientHeight,
      fovyRad: fovy,
      aspect,
    });
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
    return OrbitCam.canvasLocalToClientXY(rect, p.x, p.y);
  };

  // Simplified pinch state (modeled after common Cesium examples):
  // - PINCH_START enables pinch mode
  // - PINCH_MOVE computes a single distance delta and zooms
  // - PINCH_END disables pinch mode
  let isPinching = false;
  let pinchLastDist: number | null = null;

  cesiumGestureHandler.setInputAction(
    (e: { position1: { x: number; y: number }; position2: { x: number; y: number } }) => {
      if (!allowUserOrbitInput()) return;
      recordPointerInput();
      isPinching = true;
      const mid = OrbitCam.screenMidpoint2D(e.position1, e.position2);
      const midClient = canvasToClient(mid);
      // Cesium's internal pinch distance is scaled by 0.25 in many builds.
      const dist = OrbitCam.pinchCanvasDistanceScaled(
        e.position1.x - e.position2.x,
        e.position1.y - e.position2.y,
      );
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
      if (!allowUserOrbitInput()) return;
      if (!isPinching || !zoomAim) return;

      const delta = OrbitCam.readCesiumPinchDistanceDelta(e);
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
      const z = zoomRateScale01();
      const scale = OrbitCam.exponentialZoomScalePinch(dDist, GlobeConsts.ZOOM_SENS, z, PINCH_SENS);
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

          const opposite = OrbitCam.pinchOppositeAxisFlags({
            vxA,
            vxB,
            vyA,
            vyB,
            aXActive,
            bXActive,
            aYActive,
            bYActive,
          });

          if (dtMs > 0) {
            const { vx: vxUse, vy: vyUse } = OrbitCam.pinchPanVelocityUse(
              vxA,
              vxB,
              vyA,
              vyB,
              absVxA,
              absVxB,
              absVyA,
              absVyB,
              aXActive,
              bXActive,
              aYActive,
              bYActive,
              opposite.oppositeX,
              opposite.oppositeY,
            );

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
    const wasPinching = isPinching;
    isPinching = false;
    pinchLastDist = null;
    endPinchZoomSession();
    if (!wasPinching) return;
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
  const defaultWheelZoomLerpRate = OrbitCam.defaultWheelZoomSmoothLerpRateMs(
    GlobeConsts.ANIMATE_ON_INIT_DURA,
  );
  let wheelZoomLerpRate = defaultWheelZoomLerpRate; // higher = faster convergence

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

    const targetTheta = OrbitCam.degreesToRadians(longDeg);
    const targetPhi = OrbitCam.clampOrbitLatitudeRad(OrbitCam.degreesToRadians(latDeg), EPS);
    const startTheta = theta;
    const startPhi = phi;
    // Take the shortest way around the sphere (e.g. -179° → +179° rotates 2°, not 358°).
    const dTheta = OrbitCam.orbitShortestDeltaLongitudeRad(startTheta, targetTheta);
    const dPhi = targetPhi - startPhi;

    if (Math.abs(dTheta) < 1e-6 && Math.abs(dPhi) < 1e-6) {
      onOrbitRotateAnimationEnd?.();
      notifyCameraMotionSettledIfFullyIdle();
      return;
    }

    const startT =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const dur = Math.max(1, durationMs);

    const tick = (now: number) => {
      const u = Utils.clamp((now - startT) / dur, 0, 1);
      const sample = OrbitCam.sampledOrbitRotateAnimAngles({
        startThetaRad: startTheta,
        startPhiRad: startPhi,
        deltaThetaRad: dTheta,
        deltaPhiRad: dPhi,
        linearProgress01: u,
        latEps: EPS,
      });
      theta = sample.thetaRad;
      phi = sample.phiRad;
      applyOrbit();
      if (u < 1) {
        rotateAnimRaf = requestAnimationFrame(tick);
      } else {
        rotateAnimRaf = null;
        onOrbitRotateAnimationEnd?.();
        notifyCameraMotionSettledIfFullyIdle();
      }
    };
    rotateAnimRaf = requestAnimationFrame(tick);
  };

  const snapTo = (latDeg: number, longDeg: number) => {
    cancelRotateAnim();
    clearZoomAim();
    theta = OrbitCam.degreesToRadians(longDeg);
    phi = OrbitCam.clampOrbitLatitudeRad(OrbitCam.degreesToRadians(latDeg), EPS);
    applyOrbit();
  };

  const startWheelZoomLoop = () => {
    if (wheelZoomRaf != null) return;
    wheelZoomLastT = performance.now();

    const tick = (tNow: number) => {
      const orbitRangeClamp = {
        sphereRadiusM: radius,
        minSurfaceClearanceM:
          viewer.scene.screenSpaceCameraController.minimumZoomDistance ?? GlobeConsts.MIN_SURFACE_CLEARANCE_M,
        maxOrbitCenterDistanceM:
          viewer.scene.screenSpaceCameraController.maximumZoomDistance ?? radius * 20.0,
      };
      const step = OrbitCam.wheelSmoothZoomLerpTick({
        tNowMs: tNow,
        wheelZoomLastTMs: wheelZoomLastT,
        rangeM: range,
        wheelZoomTargetRangeM: wheelZoomTargetRange,
        lerpRate: wheelZoomLerpRate,
        orbitRangeClamp,
        zoomAimStartRangeM: zoomAim?.startRange ?? null,
        wheelZoomLastPulseTMs: wheelZoomLastPulseT,
        hasWheelZoomLastClient: wheelZoomLastClient != null,
      });
      wheelZoomLastT = step.wheelZoomLastTMs;

      if (step.stopLoop) {
        if (step.clearZoomAimIfNearStart) clearZoomAim();
        wheelZoomRaf = null;
        if (step.resetDefaultLerpRate) wheelZoomLerpRate = defaultWheelZoomLerpRate;
        notifyCameraMotionSettledIfFullyIdle();
        return;
      }

      range = step.rangeM;
      wheelZoomLastPulseT = step.wheelZoomLastPulseTMs;
      if (step.shouldPulseZoomIndicator && wheelZoomLastClient) {
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
    if (!allowUserOrbitInput()) {
      e.preventDefault();
      return;
    }
    // Any user touch/click cancels a programmatic rotation animation.
    cancelRotateAnim();

    recordPointerInput();

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
    const { vx, vy } = OrbitCam.pointerVelocityClamped(dxRaw, dyRaw, dt, 4, 3);
    const next: PointerState = {
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
      vx,
      vy,
    };
    pointers.set(e.pointerId, next);

    if (!allowUserOrbitInput()) {
      e.preventDefault();
      return;
    }

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
        phi = OrbitCam.clampOrbitLatitudeRad(phi + temp.panOffsetPhi, EPS);
        applyOrbit();
      }
      e.preventDefault();
      return;
    }

    if (mode === "zoomDrag") {
      const dy = next.y - prev.y;
      const scale = OrbitCam.exponentialZoomScaleRightDrag(dy, GlobeConsts.ZOOM_SENS, zoomRateScale01());
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
        OrbitCam.isTapOrClickCandidate({
          elapsedMs: dt,
          distancePx: dist,
          maxElapsedMs: CLICK_MAX_MS,
          maxDistancePx: CLICK_MAX_MOVE_PX,
        }) &&
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
      recordPointerInput();
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
    if (!allowUserOrbitInput()) {
      e.preventDefault();
      return;
    }
    // Any user wheel input cancels a programmatic rotation animation.
    cancelRotateAnim();

    wheelZoomFromUserInput = true;
    recordPointerInput();

    const minRange = getMinRange();
    const maxRange =
      viewer.scene.screenSpaceCameraController.maximumZoomDistance ?? radius * 20.0;
    const { targetRangeM, appliedScale } = OrbitCam.wheelOrbitCenterRangeTargetMidpointDampedWithScale({
      sphereRadiusM: radius,
      rangeM: range,
      deltaY: e.deltaY,
      minRangeM: minRange,
      maxRangeM: maxRange,
      zoomSens: GlobeConsts.ZOOM_SENS,
      multiplier: 0.55,
      zoomCurveReferenceRange: zoomCurveReferenceRange,
      zoomMin: GlobeConsts.ZOOM_MIN,
      decayFactor: GlobeConsts.ZOOM_DECAY_FACTOR,
    });
    // Midpoint-damped wheel zoom (see `wheelOrbitCenterRangeTargetMidpointDampedWithScale`):
    // target is derived from the *current* camera `range`, not the in-flight lerp target, so wheel
    // bursts do not compound against a stale `wheelZoomTargetRange`.
    wheelZoomTargetRange = targetRangeM;
    wheelZoomLastClient = { x: e.clientX, y: e.clientY };
    pulseZoomIndicator(e.clientX, e.clientY);
    wheelZoomLastPulseT = performance.now();
    if (appliedScale < 1) {
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

  const notifyCameraMotionSettledIfFullyIdle = () => {
    if (
      isGlobeViewportSamplerBusyState({
        pointersDownCount: pointers.size,
        wheelZoomActive: wheelZoomRaf !== null,
        rotateAnimActive: rotateAnimRaf !== null,
      })
    ) {
      return;
    }
    try {
      onCameraMotionSettled?.();
    } catch {
      // ignore third-party hook failures
    }
  };

  const isGlobeViewportSamplerBusy = () =>
    isGlobeViewportSamplerBusyState({
      pointersDownCount: pointers.size,
      wheelZoomActive: wheelZoomRaf !== null,
      rotateAnimActive: rotateAnimRaf !== null,
    });

  const isGlobePointerInputActive = () => pointers.size > 0;

  const isGlobeViewportPointerIdleFn = (idleThresholdMs: number, nowMs?: number) => {
    const now =
      nowMs ??
      (typeof performance !== "undefined" ? performance.now() : Date.now());
    return isGlobeViewportPointerIdle({
      pointersDownCount: pointers.size,
      msSinceLastPointerInput: now - lastPointerInputMs,
      idleThresholdMs,
    });
  };

  const shouldContinueViewportCenterSampling = () =>
    shouldContinueGlobeViewportCenterSampling({
      pointersDownCount: pointers.size,
      wheelZoomActive: wheelZoomRaf !== null,
      wheelZoomFromUserInput,
    });

  return {
    isGlobeViewportSamplerBusy,
    isGlobePointerInputActive,
    isGlobeViewportPointerIdle: isGlobeViewportPointerIdleFn,
    shouldContinueViewportCenterSampling,
    animateTo,
    snapTo,
    animateZoomToInitTarget: (durationMs?: number) => {
      animateZoomToRange(initTargetRange, durationMs);
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
    animateZoomToCameraHeightM: (heightM: number, durationMs?: number) => {
      animateZoomToRange(computeRangeFromCameraHeightM(heightM), durationMs);
    },
    snapZoomToCameraHeightM: (heightM: number) => {
      const targetRange = computeRangeFromCameraHeightM(heightM);
      if (wheelZoomRaf != null) {
        cancelAnimationFrame(wheelZoomRaf);
        wheelZoomRaf = null;
        wheelZoomLastClient = null;
      }
      clearZoomAim();
      setRange(targetRange);
      wheelZoomTargetRange = targetRange;
      applyOrbit();
    },
    getOrbitCenterDistanceM: () => range,
    animateZoomToOrbitCenterDistanceM: (centerDistanceM: number, durationMs?: number) => {
      animateZoomToRange(clampOrbitCenterDistanceM(centerDistanceM), durationMs);
    },
    snapZoomToOrbitCenterDistanceM: (centerDistanceM: number) => {
      const targetRange = clampOrbitCenterDistanceM(centerDistanceM);
      if (wheelZoomRaf != null) {
        cancelAnimationFrame(wheelZoomRaf);
        wheelZoomRaf = null;
        wheelZoomLastClient = null;
      }
      clearZoomAim();
      setRange(targetRange);
      wheelZoomTargetRange = targetRange;
      applyOrbit();
    },
    setCameraInitSurfaceOffsetM: (offsetM: number) => {
      cameraInitSurfaceOffsetM = offsetM;
      initTargetRange = computeInitTargetRange();
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

