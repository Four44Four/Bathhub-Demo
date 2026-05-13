import * as OrbitCam from "../app/_client/globe/pure/OrbitCamera";

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
  
    test("wheelZoomLerpRateForApprox99PercentInDuration", () => {
      const r = OrbitCam.wheelZoomLerpRateForApprox99PercentInDuration(1);
      expect(r).toBeCloseTo(4.605170186, 5);
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
});