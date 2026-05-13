import {
    detailLayerAlphaFromCameraHeightM,
    fxaaEnabledFromCameraHeightM,
    globeMaximumScreenSpaceErrorFromHeightM,
    streetLayerAlphaFromCameraHeightM,
} from "../app/_client/pure/GlobeLayerLod";

import {
    classifyMapPixelAsWater,
    twoToneLandOutputHsl,
    twoToneWaterOutputHsl,
} from "../app/_client/pure/TwoToneMapTile";

import { dimensionCss } from "../app/_client/pure/GlobeViewportCss";

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

describe("globeViewportCssMath", () => {
    test("dimensionCss", () => {
      expect(dimensionCss(12)).toBe("12px");
      expect(dimensionCss("100%")).toBe("100%");
    });
});