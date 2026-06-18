import * as OrbitCam from "../app/_client/pure/globe/OrbitCamera";
import * as Utils from "../app/_client/Utils";
import { Globe as GlobeConsts } from "../app/_client/ComponentConstants";

describe("orbitCameraMath", () => {
    test("smoothstep endpoints", () => {
      expect(OrbitCam.smoothstep01(0)).toBeCloseTo(0, 6);
      expect(OrbitCam.smoothstep01(1)).toBeCloseTo(1, 6);
      expect(OrbitCam.smoothstep01(0.5)).toBeCloseTo(0.5, 6);
    });
  
    test("degreesToRadians", () => {
      expect(OrbitCam.degreesToRadians(180)).toBeCloseTo(Math.PI, 6);
    });
  
    test("sphereCoverOrbitDistanceMeters matches lim=max(fovx,fovy) framing", () => {
      const radius = 6_371_000;
      const fovy = (60 * Math.PI) / 180;
      const aspect = 16 / 9;
      const d = OrbitCam.sphereCoverOrbitDistanceMeters({
        sphereRadiusM: radius,
        minCenterDistanceM: 0,
        fovyRad: fovy,
        aspect,
      });
      const fovx = OrbitCam.horizontalFovFromVerticalAndAspect(fovy, aspect);
      const lim = Math.max(fovx, fovy);
      expect(d).toBeCloseTo(radius / Math.sin(lim / 2), 3);
    });
  
    test("zoomCurveFactor01 clamps", () => {
      expect(OrbitCam.zoomCurveFactor01(100, 50, 150)).toBeCloseTo(0.5, 6);
      expect(OrbitCam.zoomCurveFactor01(40, 50, 150)).toBe(0);
      expect(OrbitCam.zoomCurveFactor01(200, 50, 150)).toBe(1);
    });
  
    test("orbitPanDeltaRadians scales with range", () => {
      const a = OrbitCam.orbitPanDeltaRadians({
        dxPx: 10,
        dyPx: 0,
        rangeM: 1e7,
        sphereRadiusM: 6.37e6,
        canvasWidthPx: 800,
        canvasHeightPx: 600,
        fovyRad: Math.PI / 3,
        aspect: 800 / 600,
      });
      const b = OrbitCam.orbitPanDeltaRadians({
        dxPx: 10,
        dyPx: 0,
        rangeM: 5e6,
        sphereRadiusM: 6.37e6,
        canvasWidthPx: 800,
        canvasHeightPx: 600,
        fovyRad: Math.PI / 3,
        aspect: 800 / 600,
      });
      expect(a.dTheta).toBeCloseTo(2 * b.dTheta, 5);
      expect(a.dPhi).toBe(0);
    });
  
    test("wheelZoomLerpRateForFullDuration", () => {
      const r = OrbitCam.wheelZoomLerpRateForFullDuration(1);
      expect(r).toBeCloseTo(OrbitCam.WHEEL_ZOOM_LERP_LAMBDA, 5);
    });

    test("defaultWheelZoomSmoothLerpRateMs matches full-duration rate for the reference duration", () => {
      const ms = GlobeConsts.MOUSE_SCROLL_WHEEL_LERP_TIME_MS;
      expect(OrbitCam.defaultWheelZoomSmoothLerpRateMs(ms)).toBeCloseTo(
        OrbitCam.wheelZoomLerpRateForFullDuration(ms / 1000),
        10,
      );
    });

    test("normalizedExpPanZoomEase01: endpoints and u=1 reaches exactly 1", () => {
      const lambda = OrbitCam.WHEEL_ZOOM_LERP_LAMBDA;
      expect(OrbitCam.normalizedExpPanZoomEase01(0, lambda)).toBe(0);
      expect(OrbitCam.normalizedExpPanZoomEase01(1, lambda)).toBe(1);
      expect(OrbitCam.normalizedExpPanZoomEase01(0.5, lambda)).toBeGreaterThan(0.5);
    });

    test("wheelSmoothZoomLogSpaceLerpM: α=0/1 endpoints and multiplicative step", () => {
      const range = 20_000_000;
      const target = 10_000_000;
      expect(OrbitCam.wheelSmoothZoomLogSpaceLerpM(range, target, 0)).toBe(range);
      expect(OrbitCam.wheelSmoothZoomLogSpaceLerpM(range, target, 1)).toBe(target);
      const half = OrbitCam.wheelSmoothZoomLogSpaceLerpM(range, target, 0.5);
      expect(half).toBeCloseTo(Math.sqrt(range * target), 4);
    });

    test("orbitRangeMetersWheelDampingFromSurfacePathMidpoint: average clearance matches average center distance", () => {
      const R = 6_371_000;
      const start = R + 500_000;
      const end = R + 100_000;
      const mid = OrbitCam.orbitRangeMetersWheelDampingFromSurfacePathMidpoint({
        sphereRadiusM: R,
        startCenterRangeM: start,
        endCenterRangeM: end,
      });
      expect(mid).toBeCloseTo((start + end) / 2, 6);
      expect(mid - R).toBeCloseTo(((start - R) + (end - R)) / 2, 6);
    });

    test("wheelOrbitCenterRangeTargetMidpointDampedWithScale: one +δ then one −δ returns near start", () => {
      const R0 = 6_371_000 * 2.5;
      const minR = 6_371_000 + 10_000;
      const maxR = 6_371_000 * 30;
      const sphereR = 6_371_000;
      const refR = 25_000_000;
      const baseArgs = {
        sphereRadiusM: sphereR,
        minRangeM: minR,
        maxRangeM: maxR,
        zoomSens: 0.01,
        multiplier: 0.55,
        zoomCurveReferenceRange: refR,
        zoomMin: 0.00005,
        decayFactor: 1.0,
      };
      const deltaMag = 100;
      const r1 = OrbitCam.wheelOrbitCenterRangeTargetMidpointDampedWithScale({
        ...baseArgs,
        rangeM: R0,
        deltaY: deltaMag,
      }).targetRangeM;
      const r2 = OrbitCam.wheelOrbitCenterRangeTargetMidpointDampedWithScale({
        ...baseArgs,
        rangeM: r1,
        deltaY: -deltaMag,
      }).targetRangeM;
      expect(Math.abs(r2 - R0) / R0).toBeLessThan(1e-6);
    });

    test("wheelOrbitCenterRangeTargetMidpointDampedWithScale: ±δ alternation is period-2 (two orbit values)", () => {
      const R0 = 6_371_000 * 2.5;
      const minR = 6_371_000 + 10_000;
      const maxR = 6_371_000 * 30;
      const sphereR = 6_371_000;
      const refR = 25_000_000;
      const baseArgs = {
        sphereRadiusM: sphereR,
        minRangeM: minR,
        maxRangeM: maxR,
        zoomSens: 0.01,
        multiplier: 0.55,
        zoomCurveReferenceRange: refR,
        zoomMin: 0.00005,
        decayFactor: 1.0,
      };
      const deltaPos = 100;
      const deltaNeg = -100;
      const evens: number[] = [];
      const odds: number[] = [];
      let r = R0;
      const pairs = 8;
      for (let i = 0; i < pairs * 2; i++) {
        const deltaY = i % 2 === 0 ? deltaPos : deltaNeg;
        r = OrbitCam.wheelOrbitCenterRangeTargetMidpointDampedWithScale({
          ...baseArgs,
          rangeM: r,
          deltaY,
        }).targetRangeM;
        if (i % 2 === 0) {
          evens.push(r);
        } else {
          odds.push(r);
        }
      }
      const e0 = evens[0]!;
      const o0 = odds[0]!;
      const relTol = 1e-5;
      for (const e of evens) {
        expect(Math.abs(e - e0) / R0).toBeLessThan(relTol);
      }
      for (const o of odds) {
        expect(Math.abs(o - o0) / R0).toBeLessThan(relTol);
      }
      expect(Math.abs(e0 - o0) / R0).toBeGreaterThan(1e-9);
    });

    test("linearSymmetricWheelZoomScale: +δ and −δ multipliers are reciprocals (cancel when composed)", () => {
      const zoomSens = 0.01;
      const zoomRateScale01 = 1;
      const multiplier = 0.55;
      const deltaMag = 100;
      const scaleNeg = OrbitCam.linearSymmetricWheelZoomScale(
        -deltaMag,
        zoomSens,
        zoomRateScale01,
        multiplier,
      );
      const scalePos = OrbitCam.linearSymmetricWheelZoomScale(
        deltaMag,
        zoomSens,
        zoomRateScale01,
        multiplier,
      );
      expect(scaleNeg * scalePos).toBeCloseTo(1, 10);
      expect(scalePos).toBeCloseTo(1 / scaleNeg, 10);
      expect(OrbitCam.linearSymmetricWheelZoomScale(0, zoomSens, zoomRateScale01, multiplier)).toBe(1);
    });

    test("linearSymmetricWheelZoomScale: huge |δ| keeps reciprocity (symmetric exponent clamp)", () => {
      const zoomSens = 1;
      const zoomRateScale01 = 1;
      const multiplier = 1;
      const deltaMag = 20;
      const raw = deltaMag * zoomSens * zoomRateScale01 * multiplier;
      expect(Math.abs(raw)).toBeGreaterThan(OrbitCam.LINEAR_SYMMETRIC_WHEEL_ZOOM_MAX_EXPONENT);
      const sNeg = OrbitCam.linearSymmetricWheelZoomScale(
        -deltaMag,
        zoomSens,
        zoomRateScale01,
        multiplier,
      );
      const sPos = OrbitCam.linearSymmetricWheelZoomScale(
        deltaMag,
        zoomSens,
        zoomRateScale01,
        multiplier,
      );
      expect(sNeg * sPos).toBeCloseTo(1, 10);
      expect(sPos).toBeCloseTo(1 / sNeg, 10);
      expect(sPos).toBeCloseTo(1e4, 6);
      expect(sNeg).toBeCloseTo(1e-4, 6);
    });

    test("linearSymmetricWheelZoomScale: equal |log scale| for ±δ (same visible zoom magnitude)", () => {
      const zoomSens = 0.01;
      const zoomRateScale01 = 1;
      const multiplier = 0.55;
      const deltaMag = 100;
      const sNeg = OrbitCam.linearSymmetricWheelZoomScale(
        -deltaMag,
        zoomSens,
        zoomRateScale01,
        multiplier,
      );
      const sPos = OrbitCam.linearSymmetricWheelZoomScale(
        deltaMag,
        zoomSens,
        zoomRateScale01,
        multiplier,
      );
      expect(Math.abs(Math.log(sNeg))).toBeCloseTo(Math.abs(Math.log(sPos)), 10);
    });

    test("linear 1+k wheel factor does not cancel: (1+k)(1-k) !== 1", () => {
      const zoomSens = 0.01;
      const zoomRateScale01 = 1;
      const multiplier = 0.55;
      const deltaMag = 100;
      const k = deltaMag * zoomSens * zoomRateScale01 * multiplier;
      expect((1 - k) * (1 + k)).not.toBeCloseTo(1, 6);
      expect((1 - k) * (1 + k)).toBeCloseTo(1 - k * k, 10);
    });
  
    test("readCesiumPinchDistanceDelta prefers start/current distance", () => {
      expect(
        OrbitCam.readCesiumPinchDistanceDelta({
          distance: { startDistance: 100, currentDistance: 130 },
        }),
      ).toEqual({ dDist: 30, distNow: 130 });
    });
  
    test("pinchPanVelocityUse picks dominant axis finger", () => {
      const { vx, vy } = OrbitCam.pinchPanVelocityUse(2, 0.5, 0, 0, 2, 0.5, 0, 0, true, false, false, false, false, false);
      expect(vx).toBe(2);
      expect(vy).toBe(0);
    });

    test("clampOrbitCenterDistanceMeters matches radius + clearance bounds", () => {
      const R = 6_371_000;
      const minC = 250;
      const maxD = R * 20;
      expect(
        OrbitCam.clampOrbitCenterDistanceMeters({
          centerDistanceM: R + 100,
          sphereRadiusM: R,
          minSurfaceClearanceM: minC,
          maxOrbitCenterDistanceM: maxD,
        }),
      ).toBe(R + minC);
      expect(
        OrbitCam.clampOrbitCenterDistanceMeters({
          centerDistanceM: R * 5,
          sphereRadiusM: R,
          minSurfaceClearanceM: minC,
          maxOrbitCenterDistanceM: maxD,
        }),
      ).toBe(R * 5);
      expect(
        OrbitCam.clampOrbitCenterDistanceMeters({
          centerDistanceM: maxD + 1e9,
          sphereRadiusM: R,
          minSurfaceClearanceM: minC,
          maxOrbitCenterDistanceM: maxD,
        }),
      ).toBe(maxD);
    });

    test("globeOrbitCameraUpWorldFromDir: equator +X uses world +Z; pole uses fallback +Y", () => {
      const u1 = OrbitCam.globeOrbitCameraUpWorldFromDir({ x: 1, y: 0, z: 0 });
      expect(u1.x).toBeCloseTo(0, 6);
      expect(u1.y).toBeCloseTo(0, 6);
      expect(u1.z).toBeCloseTo(1, 6);
      const pole = OrbitCam.globeOrbitCameraUpWorldFromDir({ x: 0, y: 0, z: 1 });
      expect(pole.x).toBe(0);
      expect(pole.y).toBe(1);
      expect(pole.z).toBe(0);
    });

    test("orbitShortestDeltaLongitudeRad matches wrapAngleRad(to - from)", () => {
      const a = 0.1;
      const b = Math.PI * 2 - 0.05;
      expect(OrbitCam.orbitShortestDeltaLongitudeRad(a, b)).toBeCloseTo(Utils.wrapAngleRad(b - a), 10);
    });

    test("sampledOrbitRotateAnimAngles: endpoints and eased midpoint", () => {
      const eps = 1e-3;
      const s0 = OrbitCam.sampledOrbitRotateAnimAngles({
        startThetaRad: 0,
        startPhiRad: 0,
        deltaThetaRad: 1,
        deltaPhiRad: 0.5,
        linearProgress01: 0,
        latEps: eps,
      });
      expect(s0.thetaRad).toBe(0);
      expect(s0.phiRad).toBeCloseTo(0, 8);
      const s1 = OrbitCam.sampledOrbitRotateAnimAngles({
        startThetaRad: 0,
        startPhiRad: 0,
        deltaThetaRad: 1,
        deltaPhiRad: 0.5,
        linearProgress01: 1,
        latEps: eps,
      });
      expect(s1.thetaRad).toBeCloseTo(1, 8);
      expect(s1.phiRad).toBeCloseTo(0.5, 8);
      const sm = OrbitCam.sampledOrbitRotateAnimAngles({
        startThetaRad: 0,
        startPhiRad: 0,
        deltaThetaRad: 2,
        deltaPhiRad: 0,
        linearProgress01: 0.5,
        latEps: eps,
      });
      const e = OrbitCam.smoothstep01(0.5);
      expect(sm.thetaRad).toBeCloseTo(2 * e, 8);
    });

    const panAnimArgs = {
      latEps: 1e-3,
    };

    test("orbitRotateAnimStep: first frame at u=0 does not complete when far from target", () => {
      const out = OrbitCam.orbitRotateAnimStep({
        nowMs: 0,
        startMs: 0,
        durationMs: 1500,
        startThetaRad: 0,
        startPhiRad: 0,
        targetThetaRad: OrbitCam.degreesToRadians(10),
        targetPhiRad: OrbitCam.degreesToRadians(5),
        ...panAnimArgs,
      });
      expect(out.done).toBe(false);
      expect(out.thetaRad).toBe(0);
      expect(out.phiRad).toBe(0);
    });

    test("orbitRotateAnimStep: early elapsed time does not complete when far from target", () => {
      const out = OrbitCam.orbitRotateAnimStep({
        nowMs: 16,
        startMs: 0,
        durationMs: 1500,
        startThetaRad: 0,
        startPhiRad: 0,
        targetThetaRad: OrbitCam.degreesToRadians(10),
        targetPhiRad: OrbitCam.degreesToRadians(5),
        ...panAnimArgs,
      });
      expect(out.done).toBe(false);
    });

    test("orbitRotateAnimStep: long pan advances gradually without early completion", () => {
      const targetTheta = OrbitCam.degreesToRadians(45);
      const targetPhi = OrbitCam.degreesToRadians(30);
      let theta = 0;
      let phi = 0;
      let done = false;
      for (let nowMs = 16; nowMs <= 160; nowMs += 16) {
        const step = OrbitCam.orbitRotateAnimStep({
          nowMs,
          startMs: 0,
          durationMs: 1500,
          startThetaRad: 0,
          startPhiRad: 0,
          targetThetaRad: targetTheta,
          targetPhiRad: targetPhi,
          ...panAnimArgs,
        });
        theta = step.thetaRad;
        phi = step.phiRad;
        done = step.done;
        if (done) break;
      }
      expect(done).toBe(false);
      expect(Math.abs(theta)).toBeGreaterThan(0);
      expect(Math.abs(phi)).toBeGreaterThan(0);
      expect(Math.abs(theta - targetTheta)).toBeGreaterThan(0.01);
      expect(Math.abs(phi - targetPhi)).toBeGreaterThan(0.01);
    });

    test("orbitRotateAnimStep: reaches target at duration end", () => {
      const durationMs = 1500;
      const targetTheta = OrbitCam.degreesToRadians(10);
      const targetPhi = OrbitCam.degreesToRadians(5);
      const out = OrbitCam.orbitRotateAnimStep({
        nowMs: durationMs,
        startMs: 0,
        durationMs,
        startThetaRad: 0,
        startPhiRad: 0,
        targetThetaRad: targetTheta,
        targetPhiRad: targetPhi,
        ...panAnimArgs,
      });
      expect(out.done).toBe(true);
      expect(out.thetaRad).toBeCloseTo(targetTheta, 8);
      expect(out.phiRad).toBeCloseTo(targetPhi, 8);
    });

    test("orbitRotateAnimStep: completes at duration end", () => {
      const targetTheta = 1.2;
      const targetPhi = 0.4;
      const out = OrbitCam.orbitRotateAnimStep({
        nowMs: 1500,
        startMs: 0,
        durationMs: 1500,
        startThetaRad: 0,
        startPhiRad: 0,
        targetThetaRad: targetTheta,
        targetPhiRad: targetPhi,
        ...panAnimArgs,
      });
      expect(out.done).toBe(true);
      expect(out.thetaRad).toBeCloseTo(targetTheta, 8);
      expect(out.phiRad).toBeCloseTo(targetPhi, 8);
    });

    test("zoomAimMergedOrbitAngles matches direct lerpAngle + clamp", () => {
      const startRange = 20e6;
      const range = 10e6;
      const minRange = 6.4e6;
      const fs = OrbitCam.zoomAimInterpolationFactor01(startRange, range, minRange);
      const panT = 0.02;
      const panP = -0.01;
      const eps = 1e-3;
      const merged = OrbitCam.zoomAimMergedOrbitAngles({
        startTheta: 0.5,
        startPhi: 0.1,
        targetTheta: 1.0,
        targetPhi: 0.2,
        startRange,
        range,
        minRange,
        panOffsetTheta: panT,
        panOffsetPhi: panP,
        latEps: eps,
      });
      expect(merged.theta).toBeCloseTo(Utils.lerpAngleRad(0.5, 1.0, fs) + panT, 10);
      expect(merged.phi).toBeCloseTo(
        OrbitCam.clampOrbitLatitudeRad(Utils.lerp(0.1, 0.2, fs) + panP, eps),
        10,
      );
    });

    test("initialOrbitRangeAndZoomReference: full-bleed keeps ref at cover even when starting near surface", () => {
      const R = 6_371_000;
      const cover = 25e6;
      const near = OrbitCam.clampOrbitCenterDistanceMeters({
        centerDistanceM: R + 1500,
        sphereRadiusM: R,
        minSurfaceClearanceM: 250,
        maxOrbitCenterDistanceM: R * 20,
      });
      const a = OrbitCam.initialOrbitRangeAndZoomReference({
        fillParent: true,
        coverOrbitDistanceM: cover,
        sphereRadiusM: R,
        minSurfaceClearanceM: 250,
        maxOrbitCenterDistanceM: R * 20,
        cameraInitSurfaceOffsetM: 1500,
        startAtInitTargetRange: true,
      });
      expect(a.zoomCurveReferenceRangeM).toBe(cover);
      expect(a.rangeM).toBe(near);
      const b = OrbitCam.initialOrbitRangeAndZoomReference({
        fillParent: true,
        coverOrbitDistanceM: cover,
        sphereRadiusM: R,
        minSurfaceClearanceM: 250,
        maxOrbitCenterDistanceM: R * 20,
        cameraInitSurfaceOffsetM: 1500,
        startAtInitTargetRange: false,
      });
      expect(b.rangeM).toBe(cover);
      expect(b.zoomCurveReferenceRangeM).toBe(cover);
    });

    test("initialOrbitRangeAndZoomReference: non-bleed uses clamped 3R reference when not startAtInit", () => {
      const R = 6_371_000;
      const maxD = R * 20;
      const ref = OrbitCam.clampOrbitCenterDistanceMeters({
        centerDistanceM: R * 3,
        sphereRadiusM: R,
        minSurfaceClearanceM: 250,
        maxOrbitCenterDistanceM: maxD,
      });
      const out = OrbitCam.initialOrbitRangeAndZoomReference({
        fillParent: false,
        coverOrbitDistanceM: null,
        sphereRadiusM: R,
        minSurfaceClearanceM: 250,
        maxOrbitCenterDistanceM: maxD,
        cameraInitSurfaceOffsetM: 1500,
        startAtInitTargetRange: false,
      });
      expect(out.zoomCurveReferenceRangeM).toBe(ref);
      expect(out.rangeM).toBe(ref);
    });

    const earthClamp = {
      sphereRadiusM: 6_371_000,
      minSurfaceClearanceM: 250,
      maxOrbitCenterDistanceM: 6_371_000 * 20,
    };

    test("wheelZoomLoopDtSecondsClamped caps delta at 50ms and floors at 0", () => {
      expect(OrbitCam.wheelZoomLoopDtSecondsClamped(1000, 1000)).toBe(0);
      expect(OrbitCam.wheelZoomLoopDtSecondsClamped(1010, 1000)).toBeCloseTo(0.01, 10);
      expect(OrbitCam.wheelZoomLoopDtSecondsClamped(1100, 1000)).toBe(0.05);
      expect(OrbitCam.wheelZoomLoopDtSecondsClamped(2000, 1000)).toBe(0.05);
    });

    const wheelAnimArgs = {
      zoomAnimStartMs: 0,
      zoomAnimDurationMs: GlobeConsts.MOUSE_SCROLL_WHEEL_LERP_TIME_MS,
    };

    test("wheelSmoothZoomLerpTick: zero-dt first frame does not complete when far from target", () => {
      const out = OrbitCam.wheelSmoothZoomLerpTick({
        tNowMs: 1000,
        wheelZoomLastTMs: 1000,
        rangeM: 20_000_000,
        zoomAnimStartRangeM: 20_000_000,
        wheelZoomTargetRangeM: 15_000_000,
        lerpRate: 18,
        orbitRangeClamp: earthClamp,
        ...wheelAnimArgs,
        zoomAnimStartMs: 1000,
        zoomAimStartRangeM: null,
        wheelZoomLastPulseTMs: 0,
        hasWheelZoomLastClient: false,
      });
      expect(out.stopLoop).toBe(false);
      expect(out.rangeM).toBe(20_000_000);
    });

    test("wheelSmoothZoomLerpTick: finishes at configured duration wall-clock", () => {
      const r = 15_000_000;
      const t = r + 5_000_000;
      const durationMs = 10_000;
      const outTight = OrbitCam.wheelSmoothZoomLerpTick({
        tNowMs: durationMs,
        wheelZoomLastTMs: durationMs - 16,
        rangeM: r + 100,
        zoomAnimStartRangeM: r,
        wheelZoomTargetRangeM: t,
        lerpRate: 18,
        orbitRangeClamp: earthClamp,
        zoomAnimStartMs: 0,
        zoomAnimDurationMs: durationMs,
        zoomAimStartRangeM: null,
        wheelZoomLastPulseTMs: 0,
        hasWheelZoomLastClient: true,
      });
      expect(outTight.stopLoop).toBe(true);
      expect(outTight.rangeM).toBe(t);
    });

    test("wheelSmoothZoomLerpTick: clearZoomAimIfNearStart when zoom aim start is near current range", () => {
      const startRange = 15_000_000;
      const range = startRange - 0.2;
      const out = OrbitCam.wheelSmoothZoomLerpTick({
        tNowMs: 100,
        wheelZoomLastTMs: 0,
        rangeM: range,
        zoomAnimStartRangeM: range,
        wheelZoomTargetRangeM: range,
        lerpRate: 18,
        orbitRangeClamp: earthClamp,
        zoomAnimStartMs: 0,
        zoomAnimDurationMs: 10_000,
        zoomAimStartRangeM: startRange,
        wheelZoomLastPulseTMs: 0,
        hasWheelZoomLastClient: false,
      });
      expect(out.stopLoop).toBe(true);
      expect(out.clearZoomAimIfNearStart).toBe(true);
    });

    test("wheelSmoothZoomLerpTick: one step matches time-based log-space lerp + orbit clamp", () => {
      const rangeM = 15_000_000;
      const wheelZoomTargetRangeM = 14_000_000;
      const zoomAnimStartMs = 1000;
      const t1 = 1160;
      const durationMs = 10_000;
      const lerpRate = 18;
      const lambda = OrbitCam.wheelZoomLerpLambdaFromRate({
        lerpRatePerSecond: lerpRate,
        durationMs,
      });
      const alpha = OrbitCam.normalizedExpPanZoomEase01(
        (t1 - zoomAnimStartMs) / durationMs,
        lambda,
      );
      const expected = OrbitCam.clampOrbitCenterDistanceMeters({
        centerDistanceM: OrbitCam.wheelSmoothZoomLogSpaceLerpM(
          rangeM,
          wheelZoomTargetRangeM,
          alpha,
        ),
        ...earthClamp,
      });
      const out = OrbitCam.wheelSmoothZoomLerpTick({
        tNowMs: t1,
        wheelZoomLastTMs: 1000,
        rangeM,
        zoomAnimStartRangeM: rangeM,
        wheelZoomTargetRangeM,
        lerpRate,
        orbitRangeClamp: earthClamp,
        zoomAnimStartMs,
        zoomAnimDurationMs: durationMs,
        zoomAimStartRangeM: null,
        wheelZoomLastPulseTMs: 0,
        hasWheelZoomLastClient: true,
      });
      expect(out.stopLoop).toBe(false);
      expect(out.rangeM).toBeCloseTo(expected, 4);
    });

    test("wheelSmoothZoomLerpTick: pulses only when zooming in, has client, and >60ms since last pulse", () => {
      const clamp = earthClamp;
      const inStep = OrbitCam.wheelSmoothZoomLerpTick({
        tNowMs: 200,
        wheelZoomLastTMs: 0,
        rangeM: 16_000_000,
        wheelZoomTargetRangeM: 14_000_000,
        lerpRate: 18,
        orbitRangeClamp: clamp,
        ...wheelAnimArgs,
        zoomAnimStartRangeM: 16_000_000,
        zoomAimStartRangeM: null,
        wheelZoomLastPulseTMs: 0,
        hasWheelZoomLastClient: true,
      });
      expect(inStep.shouldPulseZoomIndicator).toBe(true);
      expect(inStep.wheelZoomLastPulseTMs).toBe(200);

      const inNoPulseSoon = OrbitCam.wheelSmoothZoomLerpTick({
        tNowMs: 230,
        wheelZoomLastTMs: 200,
        rangeM: inStep.rangeM,
        wheelZoomTargetRangeM: 14_000_000,
        lerpRate: 18,
        orbitRangeClamp: clamp,
        ...wheelAnimArgs,
        zoomAnimStartRangeM: 16_000_000,
        zoomAimStartRangeM: null,
        wheelZoomLastPulseTMs: 200,
        hasWheelZoomLastClient: true,
      });
      expect(inNoPulseSoon.shouldPulseZoomIndicator).toBe(false);
      expect(inNoPulseSoon.wheelZoomLastPulseTMs).toBe(200);

      const outStep = OrbitCam.wheelSmoothZoomLerpTick({
        tNowMs: 500,
        wheelZoomLastTMs: 400,
        rangeM: 14_000_000,
        wheelZoomTargetRangeM: 16_000_000,
        lerpRate: 18,
        orbitRangeClamp: clamp,
        ...wheelAnimArgs,
        zoomAnimStartRangeM: 14_000_000,
        zoomAimStartRangeM: null,
        wheelZoomLastPulseTMs: 0,
        hasWheelZoomLastClient: true,
      });
      expect(outStep.shouldPulseZoomIndicator).toBe(false);
    });

    test("wheelSmoothZoomLerpTick: finishes at configured duration wall-clock over full loop", () => {
      let rangeM = 20_000_000;
      const target = 15_000_000;
      let lastT = 0;
      let pulseT = 0;
      const lerpRate = 18;
      const stepMs = 16;
      const durationMs = GlobeConsts.MOUSE_SCROLL_WHEEL_LERP_TIME_MS;
      let stopAt = 0;
      for (let i = 0; i < 400; i++) {
        const tNow = (i + 1) * stepMs;
        const out = OrbitCam.wheelSmoothZoomLerpTick({
          tNowMs: tNow,
          wheelZoomLastTMs: lastT,
          rangeM,
          zoomAnimStartRangeM: 20_000_000,
          wheelZoomTargetRangeM: target,
          lerpRate,
          orbitRangeClamp: earthClamp,
          zoomAnimStartMs: 0,
          zoomAnimDurationMs: durationMs,
          zoomAimStartRangeM: null,
          wheelZoomLastPulseTMs: pulseT,
          hasWheelZoomLastClient: false,
        });
        lastT = out.wheelZoomLastTMs;
        pulseT = out.wheelZoomLastPulseTMs;
        rangeM = out.rangeM;
        if (out.stopLoop) {
          stopAt = tNow;
          break;
        }
      }
      expect(stopAt).toBeGreaterThanOrEqual(durationMs);
      expect(stopAt).toBeLessThanOrEqual(durationMs + stepMs);
      expect(rangeM).toBe(target);
    });

    test("wheelSmoothZoomLerpTick: log-space lerp reaches target in similar time at low and high altitude", () => {
      const lerpRate = OrbitCam.defaultWheelZoomSmoothLerpRateMs(
        GlobeConsts.MOUSE_SCROLL_WHEEL_LERP_TIME_MS,
      );
      const targetMs = GlobeConsts.MOUSE_SCROLL_WHEEL_LERP_TIME_MS;
      const scale = 0.9;
      const lowStart = 8_000_000;
      const highStart = 20_000_000;
      const lowTarget = lowStart * scale;
      const highTarget = highStart * scale;
      expect(lowTarget).toBeGreaterThan(earthClamp.sphereRadiusM + earthClamp.minSurfaceClearanceM);
      const stepMs = 16;

      const timeToStop = (start: number, target: number) => {
        let rangeM = start;
        let lastT = 0;
        for (let i = 0; i < 500; i++) {
          const tNow = (i + 1) * stepMs;
          const out = OrbitCam.wheelSmoothZoomLerpTick({
            tNowMs: tNow,
            wheelZoomLastTMs: lastT,
            rangeM,
            zoomAnimStartRangeM: start,
            wheelZoomTargetRangeM: target,
            lerpRate,
            orbitRangeClamp: earthClamp,
            zoomAnimStartMs: 0,
            zoomAnimDurationMs: targetMs,
            zoomAimStartRangeM: null,
            wheelZoomLastPulseTMs: 0,
            hasWheelZoomLastClient: false,
          });
          lastT = out.wheelZoomLastTMs;
          rangeM = out.rangeM;
          if (out.stopLoop) {
            return tNow;
          }
        }
        return Number.POSITIVE_INFINITY;
      };

      const lowMs = timeToStop(lowStart, lowTarget);
      const highMs = timeToStop(highStart, highTarget);
      expect(lowMs).toBeGreaterThanOrEqual(targetMs);
      expect(lowMs).toBeLessThanOrEqual(targetMs + stepMs);
      expect(highMs).toBeGreaterThanOrEqual(targetMs);
      expect(highMs).toBeLessThanOrEqual(targetMs + stepMs);
      expect(lowMs).toBe(highMs);
    });
});