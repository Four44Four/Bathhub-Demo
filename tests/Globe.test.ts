import {
    detailLayerAlphaFromCameraHeightM,
    fxaaEnabledFromCameraHeightM,
    globeLodVisualStateFromCameraHeightM,
    globeMaximumScreenSpaceErrorFromHeightM,
    streetLayerAlphaFromCameraHeightM,
} from "../app/_client/pure/GlobeLayerLod";

import { recolorRgbaInPlace, twoTonePaletteFromRgb } from "../app/_client/pure/TwoToneTileRecolor";

import {
    classifyMapPixelAsWater,
    twoToneLandOutputHsl,
    twoToneWaterOutputHsl,
} from "../app/_client/pure/TwoToneMapTile";

import { dimensionCss } from "../app/_client/pure/GlobeViewportCss";
import * as GeoArrival from "../app/_client/pure/GeoArrivalCameraLock";
import { Globe as GlobeConsts } from "../app/_client/ComponentConstants";

describe("globeLayerLodMath", () => {
    test("detailLayerAlphaFromCameraHeightM", () => {
      expect(detailLayerAlphaFromCameraHeightM(8_000_000)).toBeCloseTo(0, 6);
      expect(detailLayerAlphaFromCameraHeightM(1_500_000)).toBeCloseTo(1, 6);
    });
  
    test("globeMaximumScreenSpaceErrorFromHeightM piecewise", () => {
      expect(globeMaximumScreenSpaceErrorFromHeightM(500)).toBe(0.35);
      expect(globeMaximumScreenSpaceErrorFromHeightM(10_000)).toBe(0.75);
      expect(globeMaximumScreenSpaceErrorFromHeightM(1_000_000)).toBe(1.25);
      expect(globeMaximumScreenSpaceErrorFromHeightM(5_000_000)).toBe(1.6);
      expect(globeMaximumScreenSpaceErrorFromHeightM(9_000_000)).toBe(2.0);
    });
  
    test("fxaaEnabledFromCameraHeightM", () => {
      expect(fxaaEnabledFromCameraHeightM(40_000)).toBe(true);
      expect(fxaaEnabledFromCameraHeightM(30_000)).toBe(false);
    });

    test("globeLodVisualStateFromCameraHeightM bundles layer + globe SSE", () => {
      const far = globeLodVisualStateFromCameraHeightM(9_000_000);
      expect(far.detailAlpha).toBeCloseTo(0, 6);
      expect(far.detailShow).toBe(false);
      expect(far.maximumScreenSpaceError).toBe(2.0);
      expect(far.fxaaEnabled).toBe(false);

      const close = globeLodVisualStateFromCameraHeightM(500);
      expect(close.streetShow).toBe(true);
      expect(close.maximumScreenSpaceError).toBe(0.35);
      expect(close.fxaaEnabled).toBe(true);
    });
});

describe("streetLayerAlphaFromCameraHeightM", () => {
    test("ramps with altitude", () => {
      expect(streetLayerAlphaFromCameraHeightM(35_000)).toBeCloseTo(0, 6);
      expect(streetLayerAlphaFromCameraHeightM(2_500)).toBeCloseTo(1, 6);
    });
});

describe("twoToneMapTileMath", () => {
    test("classifyMapPixelAsWater", () => {
      expect(classifyMapPixelAsWater(20, 30, 100)).toBe(true);
      expect(classifyMapPixelAsWater(200, 200, 50)).toBe(false);
    });
  
    test("twoToneWaterOutputHsl uses palette hue", () => {
      const out = twoToneWaterOutputHsl(0.5, { h: 200, s: 0.8, l: 0.4 });
      expect(out.h).toBe(200);
      expect(out.l).toBeGreaterThan(0);
      expect(out.l).toBeLessThanOrEqual(1);
    });
  
    test("twoToneLandOutputHsl", () => {
      const out = twoToneLandOutputHsl(
        { h: 0, s: 0.2, l: 0.5 },
        { h: 120, s: 0.3, l: 0.2 },
      );
      expect(out.h).toBe(120);
    });
});

describe("twoToneTileRecolor", () => {
  test("recolorRgbaInPlace forces full alpha", () => {
    const palette = twoTonePaletteFromRgb(
      { r: 65, g: 69, b: 126 },
      { r: 50, g: 50, b: 85 },
    );
    const data = new Uint8ClampedArray([
      20, 30, 100, 128,
      200, 200, 50, 64,
    ]);
    recolorRgbaInPlace(data, 2, 1, palette);
    expect(data[3]).toBe(255);
    expect(data[7]).toBe(255);
  });
});

describe("globeViewportCssMath", () => {
    test("dimensionCss", () => {
      expect(dimensionCss(12)).toBe("12px");
      expect(dimensionCss("100%")).toBe("100%");
    });
});

describe("geoArrivalCameraLock", () => {
  const dura = GlobeConsts.ANIMATE_ON_INIT_DURA;

  test("begin locks immediately; tick before duration keeps locked", () => {
    let s = GeoArrival.initialGeoArrivalLockState();
    expect(GeoArrival.isGlobeOrbitUserInputAllowed(s)).toBe(true);
    s = GeoArrival.beginGeoArrivalLock(s, 10_000, dura);
    expect(GeoArrival.isGlobeOrbitUserInputAllowed(s)).toBe(false);
    s = GeoArrival.reduceGeoArrivalLockForTick(s, 10_000 + dura - 1);
    expect(GeoArrival.isGlobeOrbitUserInputAllowed(s)).toBe(false);
    expect(s.kind).toBe("locked");
  });

  test("release after exactly lockDurationMs elapsed", () => {
    let s = GeoArrival.beginGeoArrivalLock(GeoArrival.initialGeoArrivalLockState(), 0, dura);
    s = GeoArrival.reduceGeoArrivalLockForTick(s, dura);
    expect(s.kind).toBe("idle");
    expect(GeoArrival.isGlobeOrbitUserInputAllowed(s)).toBe(true);
  });

  test("idle reduce is a no-op", () => {
    const s = GeoArrival.initialGeoArrivalLockState();
    const next = GeoArrival.reduceGeoArrivalLockForTick(s, 99_999);
    expect(next).toBe(s);
  });

  test("begin restarts lock window", () => {
    let s = GeoArrival.beginGeoArrivalLock(GeoArrival.initialGeoArrivalLockState(), 0, dura);
    s = GeoArrival.reduceGeoArrivalLockForTick(s, 1000);
    expect(s.kind).toBe("locked");
    s = GeoArrival.beginGeoArrivalLock(s, 1000, dura);
    expect(s).toMatchObject({ kind: "locked", lockedAtMs: 1000 });
    s = GeoArrival.reduceGeoArrivalLockForTick(s, 1000 + dura);
    expect(s.kind).toBe("idle");
  });

  test("zero duration unlocks on next tick", () => {
    let s = GeoArrival.beginGeoArrivalLock(GeoArrival.initialGeoArrivalLockState(), 5, 0);
    s = GeoArrival.reduceGeoArrivalLockForTick(s, 5);
    expect(s.kind).toBe("idle");
  });
});