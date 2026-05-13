import * as Utils from "../Utils";

export type Vec3 = { x: number; y: number; z: number };

/** Center-distance orbit radius clamped to `[sphereRadius + minSurfaceClearance, maxOrbitCenterDistance]`. */
export function clampOrbitCenterDistanceMeters(args: {
  centerDistanceM: number;
  sphereRadiusM: number;
  minSurfaceClearanceM: number;
  maxOrbitCenterDistanceM: number;
}): number {
  const minRange = args.sphereRadiusM + args.minSurfaceClearanceM;
  const maxRange = args.maxOrbitCenterDistanceM;
  return Utils.clamp(args.centerDistanceM, minRange, maxRange);
}

/**
 * World-space “up” for `setView` when the camera looks from `dir` (unit, center → eye),
 * matching `Camera.ts`: project world +Z onto the plane orthogonal to `dir`, normalize,
 * or fall back to world +Y when nearly parallel to ±Z.
 */
export function globeOrbitCameraUpWorldFromDir(dir: Vec3): Vec3 {
  const dot = dir.z;
  const px = dir.x * dot;
  const py = dir.y * dot;
  const pz = dir.z * dot;
  let ux = -px;
  let uy = -py;
  let uz = 1 - pz;
  const mag = Math.hypot(ux, uy, uz);
  if (mag < 1e-6) {
    return { x: 0, y: 1, z: 0 };
  }
  const inv = 1 / mag;
  ux *= inv;
  uy *= inv;
  uz *= inv;
  return { x: ux, y: uy, z: uz };
}

/** Shortest signed longitude delta in radians (same convention as `Utils.wrapAngleRad`). */
export function orbitShortestDeltaLongitudeRad(fromThetaRad: number, toThetaRad: number): number {
  return Utils.wrapAngleRad(toThetaRad - fromThetaRad);
}

/** One eased sample of the programmatic rotate-only animation in `Camera.animateTo`. */
export function sampledOrbitRotateAnimAngles(args: {
  startThetaRad: number;
  startPhiRad: number;
  deltaThetaRad: number;
  deltaPhiRad: number;
  /** `clamp((now - startT) / durationMs, 0, 1)` before smoothstep. */
  linearProgress01: number;
  latEps: number;
}): { thetaRad: number; phiRad: number } {
  const u = Utils.clamp(args.linearProgress01, 0, 1);
  const e = smoothstep01(u);
  return {
    thetaRad: args.startThetaRad + args.deltaThetaRad * e,
    phiRad: clampOrbitLatitudeRad(args.startPhiRad + args.deltaPhiRad * e, args.latEps),
  };
}

/** Merges zoom-aim interpolation into orbit angles (same as `applyZoomAimIfActive` in `Camera.ts`). */
export function zoomAimMergedOrbitAngles(args: {
  startTheta: number;
  startPhi: number;
  targetTheta: number;
  targetPhi: number;
  startRange: number;
  range: number;
  minRange: number;
  panOffsetTheta: number;
  panOffsetPhi: number;
  latEps: number;
}): { theta: number; phi: number } {
  const fs = zoomAimInterpolationFactor01(args.startRange, args.range, args.minRange);
  return {
    theta: Utils.lerpAngleRad(args.startTheta, args.targetTheta, fs) + args.panOffsetTheta,
    phi: clampOrbitLatitudeRad(
      Utils.lerp(args.startPhi, args.targetPhi, fs) + args.panOffsetPhi,
      args.latEps,
    ),
  };
}

/**
 * Initial orbit `range` and `zoomCurveReferenceRange` after install (full-bleed vs fixed layout).
 */
export function initialOrbitRangeAndZoomReference(args: {
  fillParent: boolean;
  /** Required when `fillParent` (from {@link sphereCoverOrbitDistanceMeters}). */
  coverOrbitDistanceM: number | null;
  sphereRadiusM: number;
  minSurfaceClearanceM: number;
  maxOrbitCenterDistanceM: number;
  cameraInitSurfaceOffsetM: number;
  startAtInitTargetRange?: boolean;
}): { rangeM: number; zoomCurveReferenceRangeM: number } {
  const initTarget = clampOrbitCenterDistanceMeters({
    centerDistanceM: args.sphereRadiusM + args.cameraInitSurfaceOffsetM,
    sphereRadiusM: args.sphereRadiusM,
    minSurfaceClearanceM: args.minSurfaceClearanceM,
    maxOrbitCenterDistanceM: args.maxOrbitCenterDistanceM,
  });
  if (args.fillParent) {
    const cover = args.coverOrbitDistanceM!;
    return {
      zoomCurveReferenceRangeM: cover,
      rangeM: args.startAtInitTargetRange ? initTarget : cover,
    };
  }
  const ref = clampOrbitCenterDistanceMeters({
    centerDistanceM: args.sphereRadiusM * 3.0,
    sphereRadiusM: args.sphereRadiusM,
    minSurfaceClearanceM: args.minSurfaceClearanceM,
    maxOrbitCenterDistanceM: args.maxOrbitCenterDistanceM,
  });
  return {
    zoomCurveReferenceRangeM: ref,
    rangeM: args.startAtInitTargetRange ? initTarget : ref,
  };
}

export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function smoothstep01(u: number): number {
  const t = Utils.clamp01(u);
  return t * t * (3 - 2 * t);
}

/** Unit direction from orbit angles (theta around Z, phi from equator), matching Camera.ts. */
export function orbitUnitDirectionFromAngles(theta: number, phi: number): Vec3 {
  return {
    x: Math.cos(phi) * Math.cos(theta),
    y: Math.cos(phi) * Math.sin(theta),
    z: Math.sin(phi),
  };
}

export function sphericalDirToThetaPhi(dir: Vec3): { theta: number; phi: number } {
  return {
    theta: Math.atan2(dir.y, dir.x),
    phi: Math.asin(Utils.clamp(dir.z, -1, 1)),
  };
}

export function horizontalFovFromVerticalAndAspect(
  fovyRad: number,
  aspect: number,
): number {
  return 2 * Math.atan(Math.tan(fovyRad / 2) * aspect);
}

/**
 * Orbit distance so a sphere of radius `sphereRadiusM` subtends the larger frustum axis (“cover”).
 */
export function sphereCoverOrbitDistanceMeters(args: {
  sphereRadiusM: number;
  minCenterDistanceM: number;
  fovyRad: number;
  aspect: number;
}): number {
  const { sphereRadiusM, minCenterDistanceM, fovyRad, aspect } = args;
  const fovx = horizontalFovFromVerticalAndAspect(fovyRad, aspect);
  const lim = Math.max(fovx, fovyRad);
  return Math.max(minCenterDistanceM, sphereRadiusM / Math.sin(lim / 2));
}

export function zoomCurveFactor01(
  range: number,
  minRange: number,
  referenceRange: number,
): number {
  const denom = Math.max(1, referenceRange - minRange);
  return Utils.clamp((range - minRange) / denom, 0, 1);
}

export function zoomRateScale01(
  curveFactor01: number,
  zoomMin: number,
  decayFactor: number,
): number {
  return Math.max(zoomMin, curveFactor01 / decayFactor);
}

/**
 * Center-distance orbit radius whose radial clearance above the sphere matches the midpoint
 * between the clearances at `startCenterRangeM` and `endCenterRangeM`. Used as the sample radius
 * for wheel `zoomCurveFactor01` / `zoomRateScale01` so damping follows the midpoint between the
 * current camera and a one-step pre-clamped destination (`range * scale_probe`).
 */
export function orbitRangeMetersWheelDampingFromSurfacePathMidpoint(args: {
  sphereRadiusM: number;
  startCenterRangeM: number;
  endCenterRangeM: number;
}): number {
  const c0 = Math.max(0, args.startCenterRangeM - args.sphereRadiusM);
  const c1 = Math.max(0, args.endCenterRangeM - args.sphereRadiusM);
  return args.sphereRadiusM + (c0 + c1) / 2;
}

/**
 * One mouse-wheel tick: find `zoomRateScale01` self-consistent with the **surface-clearance
 * midpoint** between the current orbit and the clamped destination `range * scale(δ, z)` (same
 * `z` in both places). Alternating ±`deltaY` then stays numerically stable (tests).
 */
export function wheelOrbitCenterRangeTargetMidpointDampedWithScale(args: {
  sphereRadiusM: number;
  rangeM: number;
  deltaY: number;
  minRangeM: number;
  maxRangeM: number;
  zoomSens: number;
  multiplier: number;
  zoomCurveReferenceRange: number;
  zoomMin: number;
  decayFactor: number;
}): { targetRangeM: number; appliedScale: number } {
  const clampR = (x: number) => Utils.clamp(x, args.minRangeM, args.maxRangeM);
  const zAtR = (r: number) =>
    zoomRateScale01(
      zoomCurveFactor01(r, args.minRangeM, args.zoomCurveReferenceRange),
      args.zoomMin,
      args.decayFactor,
    );
  let z = zAtR(args.rangeM);
  for (let i = 0; i < 12; i++) {
    const dest = clampR(
      args.rangeM *
        linearSymmetricWheelZoomScale(args.deltaY, args.zoomSens, z, args.multiplier),
    );
    const rMid = orbitRangeMetersWheelDampingFromSurfacePathMidpoint({
      sphereRadiusM: args.sphereRadiusM,
      startCenterRangeM: args.rangeM,
      endCenterRangeM: dest,
    });
    const zNext = zAtR(rMid);
    if (Math.abs(zNext - z) <= 1e-15 * Math.max(1, z)) {
      z = zNext;
      break;
    }
    z = zNext;
  }
  const appliedScale = linearSymmetricWheelZoomScale(
    args.deltaY,
    args.zoomSens,
    z,
    args.multiplier,
  );
  const dest = clampR(args.rangeM * appliedScale);
  return { targetRangeM: dest, appliedScale: dest / args.rangeM };
}

export function orbitPanDeltaRadians(args: {
  dxPx: number;
  dyPx: number;
  rangeM: number;
  sphereRadiusM: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
  fovyRad: number;
  aspect: number;
}): { dTheta: number; dPhi: number } {
  const {
    dxPx,
    dyPx,
    rangeM,
    sphereRadiusM,
    canvasWidthPx,
    canvasHeightPx,
    fovyRad,
    aspect,
  } = args;
  const fovx = horizontalFovFromVerticalAndAspect(fovyRad, aspect);
  const w = Math.max(1, canvasWidthPx);
  const h = Math.max(1, canvasHeightPx);
  const fxPx = (w / 2) / Math.tan(fovx / 2);
  const fyPx = (h / 2) / Math.tan(fovyRad / 2);
  const dTheta = (dxPx * rangeM) / (Math.max(1, fxPx) * sphereRadiusM);
  const dPhi = (dyPx * rangeM) / (Math.max(1, fyPx) * sphereRadiusM);
  return { dTheta, dPhi };
}

export function zoomAimInterpolationFactor01(
  startRange: number,
  range: number,
  minRange: number,
): number {
  const denom = Math.max(1e-6, startRange - minRange);
  const f = Utils.clamp((startRange - range) / denom, 0, 1);
  return smoothstep01(f);
}

export function wheelZoomExponentialBlendAlpha(
  dtSeconds: number,
  lerpRate: number,
): number {
  return 1 - Math.exp(-dtSeconds * lerpRate);
}

/** Same dt cap as `Camera.ts` wheel RAF: seconds since last tick, floored at 0, capped at 50ms. */
export function wheelZoomLoopDtSecondsClamped(
  tNowMs: number,
  wheelZoomLastTMs: number,
): number {
  return Math.min(0.05, Math.max(0, (tNowMs - wheelZoomLastTMs) / 1000));
}

/**
 * One frame of the exponential smooth-zoom RAF loop (wheel / programmatic zoom-to-init).
 * Side effects (`applyOrbit`, pulse UI) stay in `Camera.ts`.
 */
export function wheelSmoothZoomLerpTick(args: {
  tNowMs: number;
  wheelZoomLastTMs: number;
  rangeM: number;
  wheelZoomTargetRangeM: number;
  lerpRate: number;
  orbitRangeClamp: {
    sphereRadiusM: number;
    minSurfaceClearanceM: number;
    maxOrbitCenterDistanceM: number;
  };
  /** `zoomAim.startRange` when a zoom-aim session exists, else `null`. */
  zoomAimStartRangeM: number | null;
  wheelZoomLastPulseTMs: number;
  hasWheelZoomLastClient: boolean;
}): {
  wheelZoomLastTMs: number;
  rangeM: number;
  stopLoop: boolean;
  /** When true, caller resets lerp rate to 18 (default wheel smoothing). */
  resetDefaultLerpRate: boolean;
  /** When stopping: clear zoom aim if `|range − zoomAim.startRange| < 0.5`. */
  clearZoomAimIfNearStart: boolean;
  shouldPulseZoomIndicator: boolean;
  wheelZoomLastPulseTMs: number;
} {
  const wheelZoomLastTMs = args.tNowMs;
  const dt = wheelZoomLoopDtSecondsClamped(args.tNowMs, args.wheelZoomLastTMs);
  const remaining = Math.abs(args.wheelZoomTargetRangeM - args.rangeM);
  if (remaining < 0.01) {
    const clearZoomAimIfNearStart =
      args.zoomAimStartRangeM !== null &&
      Math.abs(args.rangeM - args.zoomAimStartRangeM) < 0.5;
    return {
      wheelZoomLastTMs,
      rangeM: args.rangeM,
      stopLoop: true,
      resetDefaultLerpRate: true,
      clearZoomAimIfNearStart,
      shouldPulseZoomIndicator: false,
      wheelZoomLastPulseTMs: args.wheelZoomLastPulseTMs,
    };
  }

  const alpha = wheelZoomExponentialBlendAlpha(dt, args.lerpRate);
  const prevRange = args.rangeM;
  const lerped = Utils.lerp(args.rangeM, args.wheelZoomTargetRangeM, alpha);
  const nextRangeM = clampOrbitCenterDistanceMeters({
    centerDistanceM: lerped,
    sphereRadiusM: args.orbitRangeClamp.sphereRadiusM,
    minSurfaceClearanceM: args.orbitRangeClamp.minSurfaceClearanceM,
    maxOrbitCenterDistanceM: args.orbitRangeClamp.maxOrbitCenterDistanceM,
  });

  const zoomingIn = args.wheelZoomTargetRangeM < prevRange - 1e-6;
  const shouldPulseZoomIndicator =
    args.hasWheelZoomLastClient &&
    zoomingIn &&
    args.tNowMs - args.wheelZoomLastPulseTMs > 60;

  return {
    wheelZoomLastTMs,
    rangeM: nextRangeM,
    stopLoop: false,
    resetDefaultLerpRate: false,
    clearZoomAimIfNearStart: false,
    shouldPulseZoomIndicator,
    wheelZoomLastPulseTMs: shouldPulseZoomIndicator
      ? args.tNowMs
      : args.wheelZoomLastPulseTMs,
  };
}

/** Rate such that `1 - exp(-rate * durationS) ≈ 0.99` (same constant as Camera.ts). */
export function wheelZoomLerpRateForApprox99PercentInDuration(durationSeconds: number): number {
  return 4.605170186 / Math.max(0.001, durationSeconds);
}

/** `exp(±L)` hits reciprocal scale bounds; clamping **raw** exponent to `[-L, L]` keeps `scale(δ)*scale(−δ)===1` (clamping `exp` output does not). */
export const LINEAR_SYMMETRIC_WHEEL_ZOOM_MAX_EXPONENT = Math.log(1e4);

/**
 * Orbit-range multiplier for mouse wheel zoom.
 * Uses `exp(deltaY * …)` so opposite deltas are **multiplicative inverses**:
 * `scale(+δ) * scale(-δ) === 1` (before range clamping in the camera). That way alternating
 * scroll in/out does not drift, and **visible** zoom (log-range / ratio) is the same magnitude
 * for +δ and −δ. A linear `1 + deltaY * …` factor does **not** cancel (`(1+k)(1-k) = 1-k²`).
 *
 * The raw exponent is clamped symmetrically to `±LINEAR_SYMMETRIC_WHEEL_ZOOM_MAX_EXPONENT`
 * before `exp`, so both directions saturate at reciprocal limits together; clamping only the
 * `exp` result breaks reciprocity when one side hits `1e4` and the other stays above `1e-4`.
 */
export function linearSymmetricWheelZoomScale(
  deltaY: number,
  zoomSens: number,
  zoomRateScale01: number,
  multiplier: number,
): number {
  const rawExponent = deltaY * zoomSens * zoomRateScale01 * multiplier;
  const exponent = Utils.clamp(
    rawExponent,
    -LINEAR_SYMMETRIC_WHEEL_ZOOM_MAX_EXPONENT,
    LINEAR_SYMMETRIC_WHEEL_ZOOM_MAX_EXPONENT,
  );
  return Math.exp(exponent);
}

export function exponentialZoomScalePinch(
  pinchDistanceDelta: number,
  zoomSens: number,
  zoomRateScale01: number,
  pinchSens: number,
): number {
  return Math.exp(
    -pinchDistanceDelta * zoomSens * zoomRateScale01 * 0.15 * pinchSens,
  );
}

export function exponentialZoomScaleRightDrag(
  dyPx: number,
  zoomSens: number,
  zoomRateScale01: number,
): number {
  return Math.exp(dyPx * zoomSens * zoomRateScale01 * 0.5);
}

export function clampOrbitLatitudeRad(
  latRad: number,
  eps: number,
): number {
  return Utils.clamp(latRad, -Math.PI / 2 + eps, Math.PI / 2 - eps);
}

export function screenMidpoint2D(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function pinchCanvasDistanceScaled(
  dx: number,
  dy: number,
  scale = 0.25,
): number {
  return scale * Math.max(0, Math.hypot(dx, dy));
}

export function pointerVelocityClamped(
  dxPx: number,
  dyPx: number,
  dtMs: number,
  dtFloorMs: number,
  vMax: number,
): { vx: number; vy: number } {
  const dtForVel = Math.max(dtFloorMs, dtMs);
  return {
    vx: Utils.clamp(dxPx / dtForVel, -vMax, vMax),
    vy: Utils.clamp(dyPx / dtForVel, -vMax, vMax),
  };
}

export function shouldRelockZoomAim(
  dxPx: number,
  dyPx: number,
  thresholdPx: number,
): boolean {
  return Math.hypot(dxPx, dyPx) >= thresholdPx;
}

export function isTapOrClickCandidate(args: {
  elapsedMs: number;
  distancePx: number;
  maxElapsedMs: number;
  maxDistancePx: number;
}): boolean {
  return (
    args.elapsedMs < args.maxElapsedMs && args.distancePx < args.maxDistancePx
  );
}

export function canvasLocalToClientXY(
  canvasRect: { left: number; top: number },
  xOnCanvas: number,
  yOnCanvas: number,
): { x: number; y: number } {
  return {
    x: canvasRect.left + xOnCanvas,
    y: canvasRect.top + yOnCanvas,
  };
}

export type PinchDistanceDeltaRead = {
  dDist: number;
  distNow?: number;
};

export function readCesiumPinchDistanceDelta(ev: unknown): PinchDistanceDeltaRead | null {
  const e = ev as {
    distance?: {
      startDistance?: number;
      currentDistance?: number;
      startPosition?: { x: number; y: number };
      endPosition?: { x: number; y: number };
    };
  };

  if (
    typeof e.distance?.currentDistance === "number" &&
    typeof e.distance?.startDistance === "number"
  ) {
    return {
      dDist: e.distance.currentDistance - e.distance.startDistance,
      distNow: e.distance.currentDistance,
    };
  }

  const endY = e.distance?.endPosition?.y;
  const startY = e.distance?.startPosition?.y;
  if (typeof endY === "number" && typeof startY === "number") {
    return { dDist: endY - startY, distNow: endY };
  }

  if (typeof e.distance?.currentDistance === "number") {
    return { dDist: 0, distNow: e.distance.currentDistance };
  }
  if (typeof e.distance?.endPosition?.y === "number") {
    return { dDist: 0, distNow: e.distance.endPosition.y };
  }
  return null;
}

export function pinchPanVelocityUse(
  vxA: number,
  vxB: number,
  vyA: number,
  vyB: number,
  absVxA: number,
  absVxB: number,
  absVyA: number,
  absVyB: number,
  aXActive: boolean,
  bXActive: boolean,
  aYActive: boolean,
  bYActive: boolean,
  oppositeX: boolean,
  oppositeY: boolean,
): { vx: number; vy: number } {
  let vxUse = 0;
  if (!oppositeX) {
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

  return { vx: vxUse, vy: vyUse };
}

export function pinchOppositeAxisFlags(args: {
  vxA: number;
  vxB: number;
  vyA: number;
  vyB: number;
  aXActive: boolean;
  bXActive: boolean;
  aYActive: boolean;
  bYActive: boolean;
}): { oppositeX: boolean; oppositeY: boolean } {
  const { vxA, vxB, vyA, vyB, aXActive, bXActive, aYActive, bYActive } = args;
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
  return { oppositeX, oppositeY };
}
