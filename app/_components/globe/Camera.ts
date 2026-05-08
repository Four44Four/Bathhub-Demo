import type * as CesiumTypes from "cesium";
import type { RefObject } from "react";

import { Globe as GlobeConsts } from "../ComponentConstants";

export type InstallOrbitCameraOptions = {
  Cesium: typeof import("cesium");
  viewer: CesiumTypes.Viewer;
  ellipsoid: CesiumTypes.Ellipsoid;
  radius: number;
  initLat: number;
  initLong: number;
  width: number | string;
  containerRef: RefObject<HTMLElement | null>;
  zoomIndicatorRootRef?: RefObject<HTMLElement | null>;
  onZoomIndicatorPulse?: (x: number, y: number) => void;
  onClickLatLonDegrees?: (lat: number, lon: number) => void;
};

export type InstalledOrbitCameraControls = {
  /** Call on cleanup to remove all input listeners and cancel animations. */
  destroy: () => void;
};

export function installOrbitCameraControls({
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
  onClickLatLonDegrees,
}: InstallOrbitCameraOptions): InstalledOrbitCameraControls {
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const EPS = 1e-3;

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

  const wrapAngleRad = (a: number) => {
    // Normalize to [-pi, pi)
    const twoPi = Math.PI * 2;
    let x = ((a + Math.PI) % twoPi + twoPi) % twoPi;
    x -= Math.PI;
    return x;
  };

  const lerpAngleRad = (a: number, b: number, t: number) => {
    // Lerp the shortest way around the circle.
    const da = wrapAngleRad(b - a);
    return a + da * t;
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

  /** Full-bleed layout: zoom so the sphere’s limb subtends the larger of the two frustum FOVs (“cover”), clipping on the shorter axis (portrait: left/right). */
  const fillParent = typeof width === "string" && width === "100%";
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
    return clamp((range - minRange) / denom, 0, 1);
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
    range = clamp(next, minRange, maxRange);
  };

  const clampRangeValue = (next: number) => {
    const minSurface =
      viewer.scene.screenSpaceCameraController.minimumZoomDistance ?? GlobeConsts.MIN_SURFACE_CLEARANCE_M;
    const maxSurface = viewer.scene.screenSpaceCameraController.maximumZoomDistance ?? radius * 20.0;
    const minRange = radius + minSurface;
    const maxRange = maxSurface;
    return clamp(next, minRange, maxRange);
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
      targetPhi: Math.asin(clamp(dir.z, -1, 1)),
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
      targetPhi: Math.asin(clamp(dir.z, -1, 1)),
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
    const f = clamp((zoomAim.startRange - range) / denom, 0, 1);
    const fs = f * f * (3 - 2 * f);
    theta = lerpAngleRad(zoomAim.startTheta, zoomAim.targetTheta, fs) + zoomAim.panOffsetTheta;
    phi = clamp(
      lerp(zoomAim.startPhi, zoomAim.targetPhi, fs) + zoomAim.panOffsetPhi,
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
    lockedMid: { x: number; y: number };
    lastDist: number;
    lastUpdateT: number;
  };
  let pinchZoomSession: PinchZoomSession | null = null;

  const beginPinchZoomSession = (ids: [number, number]): boolean => {
    const a = pointers.get(ids[0]);
    const b = pointers.get(ids[1]);
    if (!a || !b) return false;

    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dist = Math.max(8, Math.hypot(a.x - b.x, a.y - b.y));

    // Lock the zoom target location for the entire pinch session.
    clearZoomAim();
    beginZoomAim(midX, midY);
    if (!zoomAim) return false;

    pinchZoomSession = {
      ids,
      lockedMid: { x: midX, y: midY },
      lastDist: dist,
      lastUpdateT: Math.max(a.t, b.t),
    };

    return true;
  };

  const endPinchZoomSession = () => {
    pinchZoomSession = null;
  };

  const updatePinchZoomSession = () => {
    if (!pinchZoomSession || !zoomAim) return;
    const a = pointers.get(pinchZoomSession.ids[0]);
    const b = pointers.get(pinchZoomSession.ids[1]);
    if (!a || !b) return;

    const tNow = Math.max(a.t, b.t);
    const dtMs = Math.max(0, tNow - pinchZoomSession.lastUpdateT);
    pinchZoomSession.lastUpdateT = tNow;

    // Zoom: scale directly from pinch distance delta, slowed by `closeFactor01()`.
    const distNow = Math.max(8, Math.hypot(a.x - b.x, a.y - b.y));
    const dDist = distNow - pinchZoomSession.lastDist;
    pinchZoomSession.lastDist = distNow;

    // Swap pinch in/out: decreasing distance zooms OUT, increasing distance zooms IN.
    // Make pinch 9x as sensitive as wheel-equivalent input.
    const PINCH_SENS = 9.0;
    const z = Math.max(GlobeConsts.ZOOM_MIN, closeFactor01());
    const scale = Math.exp(-dDist * GlobeConsts.ZOOM_SENS * z * 0.15 * PINCH_SENS);
    if (scale < 1) pulseZoomIndicator(pinchZoomSession.lockedMid.x, pinchZoomSession.lockedMid.y);
    zoomBy(z);

    // Rotate concurrently based on the fingers' screen-space velocities.
    // Apply the same logic independently to X and Y, and rotate on the corresponding axes.
    const V_EPS = 0.02;
    const vxA = a.vx;
    const vxB = b.vx;
    const vyA = a.vy;
    const vyB = b.vy;

    const ax = Math.abs(vxA);
    const bx = Math.abs(vxB);
    const ay = Math.abs(vyA);
    const by = Math.abs(vyB);

    // Pointer events are not synchronized: often only one finger emits `pointermove`
    // at a time. When reversing direction, the "other" finger's last-read velocity
    // can temporarily have the opposite sign, which would incorrectly block rotation.
    // Treat a finger as contributing only if its velocity is non-trivial AND recent.
    const RECENT_MS = 60;
    const aRecent = tNow - a.t <= RECENT_MS;
    const bRecent = tNow - b.t <= RECENT_MS;

    const aXActive = ax > V_EPS && aRecent;
    const bXActive = bx > V_EPS && bRecent;
    const aYActive = ay > V_EPS && aRecent;
    const bYActive = by > V_EPS && bRecent;

    const oppositeX =
      aXActive && bXActive && Math.sign(vxA) !== 0 && Math.sign(vxB) !== 0 && Math.sign(vxA) !== Math.sign(vxB);
    const oppositeY =
      aYActive && bYActive && Math.sign(vyA) !== 0 && Math.sign(vyB) !== 0 && Math.sign(vyA) !== Math.sign(vyB);

    if (dtMs > 0) {
      let vxUse = 0;
      if (!oppositeX) {
        if (aXActive && bXActive) vxUse = ax >= bx ? vxA : vxB;
        else if (aXActive) vxUse = vxA;
        else if (bXActive) vxUse = vxB;
      }

      let vyUse = 0;
      if (!oppositeY) {
        if (aYActive && bYActive) vyUse = ay >= by ? vyA : vyB;
        else if (aYActive) vyUse = vyA;
        else if (bYActive) vyUse = vyB;
      }

      if (vxUse !== 0 || vyUse !== 0) {
        const dx = vxUse * dtMs;
        const dy = vyUse * dtMs;
        applyDragRotate(dx, dy, zoomAim);
      }
    }

    // Apply immediately so pan/rotate stays responsive during the pinch.
    applyZoomAimIfActive();
    applyOrbit();
  };

  // Click/tap heuristics.
  const CLICK_MAX_MS = 450;
  const CLICK_MAX_MOVE_PX = 6;

  let wheelZoomTargetRange = range;
  let wheelZoomLastClient: { x: number; y: number } | null = null;
  let wheelZoomRaf: number | null = null;
  let wheelZoomLastT = 0;
  let wheelZoomLastPulseT = 0;

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
        return;
      }

      const alpha = 1 - Math.exp(-dt * 18);
      const prevRange = range;
      const nextRange = lerp(range, wheelZoomTargetRange, alpha);
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
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp, vx: 0, vy: 0 });
    pointerDownMeta.set(e.pointerId, { x: e.clientX, y: e.clientY, t: Date.now(), button: e.button });

    if (e.pointerType === "mouse") {
      if (e.button === 2) {
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
        const ids = Array.from(pointers.keys()).sort((x, y) => x - y) as [number, number];
        if (wheelZoomRaf != null) {
          cancelAnimationFrame(wheelZoomRaf);
          wheelZoomRaf = null;
          wheelZoomTargetRange = range;
          wheelZoomLastClient = null;
        }
        if (beginPinchZoomSession(ids)) {
          mode = "pinchZoom";
        }
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
    const vx = clamp(dxRaw / dtForVel, -3, 3);
    const vy = clamp(dyRaw / dtForVel, -3, 3);
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
        theta = wrapAngleRad(theta + temp.panOffsetTheta);
        phi = clamp(phi + temp.panOffsetPhi, -Math.PI / 2 + EPS, Math.PI / 2 - EPS);
        applyOrbit();
      }
      e.preventDefault();
      return;
    }

    if (mode === "zoomDrag") {
      const dy = next.y - prev.y;
      const z = zoomRateScale01();
      const scale = Math.exp(dy * GlobeConsts.ZOOM_SENS * z);
      if (scale < 1) {
        ensureZoomAimForClientXY(next.x, next.y);
        pulseZoomIndicator(next.x, next.y);
      }
      zoomBy(scale);
      e.preventDefault();
      return;
    }

    if (mode === "pinchZoom" && pointers.size >= 2) {
      updatePinchZoomSession();
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
      if (mode === "pinchZoom") clearZoomAim();
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
    const z = zoomRateScale01();
    const scale = Math.exp(e.deltaY * GlobeConsts.ZOOM_SENS * z * 0.15);
    wheelZoomTargetRange = clampRangeValue(wheelZoomTargetRange * scale);
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

  return {
    destroy: () => {
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
      clearZoomAim();
      endPinchZoomSession();
      pointers.clear();
      pointerDownMeta.clear();
    },
  };
}

