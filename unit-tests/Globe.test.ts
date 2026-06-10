import {
    detailLayerAlphaFromCameraHeightM,
    fxaaEnabledFromCameraHeightM,
    globeLodVisualStateFromCameraHeightM,
    globeMaximumScreenSpaceErrorFromHeightM,
    streetLayerAlphaFromCameraHeightM,
} from "../app/_client/pure/globe/GlobeLayerLod";

import { recolorRgbaInPlace, twoTonePaletteFromRgb } from "../app/_client/pure/globe/TwoToneTileRecolor";

import {
    classifyMapPixelAsWater,
    twoToneLandOutputHsl,
    twoToneWaterOutputHsl,
} from "../app/_client/pure/globe/TwoToneMapTile";

import { dimensionCss } from "../app/_client/pure/globe/GlobeViewportCss";
import * as GeoArrival from "../app/_client/pure/globe/GeoArrivalCameraLock";
import { Globe as GlobeConsts } from "../app/_client/ComponentConstants";
import { installOrbitCameraControls } from "../app/_client/globe/Camera";
import type { GlobeViewportHandle } from "../app/_client/globe/GlobeViewport";

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

/** Minimal Cesium stand-in so `installOrbitCameraControls` can run in Jest (node). */
type MockCartesian3 = { x: number; y: number; z: number };

function createMockCesium() {
  class Cartesian3 implements MockCartesian3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    static multiplyByScalar(c: MockCartesian3, s: number, result: Cartesian3) {
      result.x = c.x * s;
      result.y = c.y * s;
      result.z = c.z * s;
      return result;
    }
    static negate(c: MockCartesian3, result: Cartesian3) {
      result.x = -c.x;
      result.y = -c.y;
      result.z = -c.z;
      return result;
    }
    static normalize(c: MockCartesian3, result: Cartesian3) {
      const len = Math.hypot(c.x, c.y, c.z) || 1;
      result.x = c.x / len;
      result.y = c.y / len;
      result.z = c.z / len;
      return result;
    }
  }

  return {
    Matrix4: { IDENTITY: {} },
    Cartesian3,
    Cartesian2: class {
      constructor(
        public x: number,
        public y: number,
      ) {}
    },
    defined: (v: unknown) => v !== undefined && v !== null,
    ScreenSpaceEventHandler: class {
      setInputAction() {}
      destroy() {}
    },
    ScreenSpaceEventType: {
      PINCH_START: 1,
      PINCH_MOVE: 2,
      PINCH_END: 3,
    },
  } as unknown as typeof import("cesium");
}

type OrbitCameraTestHarness = {
  globeRef: Pick<GlobeViewportHandle, "animateTo" | "snapTo">;
  rebuildPath: jest.Mock<void, []>;
  /** Simulates Cesium emitting `camera.moveEnd` after an instantaneous camera update. */
  fireCameraMoveEnd: () => void;
  destroy: () => void;
};

function installOrbitCameraPathRebuildHarness(initLat = 0, initLong = 0): OrbitCameraTestHarness {
  const Cesium = createMockCesium();
  const moveEndListeners = new Set<() => void>();
  const canvas = {
    style: { touchAction: "" as string },
    clientWidth: 800,
    clientHeight: 600,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setPointerCapture: jest.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  };

  const fireCameraMoveEnd = () => {
    for (const fn of moveEndListeners) fn();
  };

  const viewer = {
    resize: jest.fn(),
    forceResize: jest.fn(),
    scene: {
      canvas,
      requestRender: jest.fn(),
      pickPositionSupported: false,
      globe: { pick: () => undefined },
      screenSpaceCameraController: {
        minimumZoomDistance: GlobeConsts.MIN_SURFACE_CLEARANCE_M,
        maximumZoomDistance: 6_371_000 * 20,
        enableInputs: true,
        enableRotate: true,
        enableLook: true,
        enableTilt: true,
        enableTranslate: true,
        enableZoom: true,
        maximumTiltAngle: Math.PI / 2,
        enableCollisionDetection: true,
      },
    },
    camera: {
      frustum: { fovy: Math.PI / 3, aspectRatio: 800 / 600 },
      pickEllipsoid: () => undefined,
      getPickRay: () => null,
      lookAtTransform: jest.fn(),
      /** Cesium defers `moveEnd` while the camera is still moving frame-to-frame. */
      setView: jest.fn(),
      moveEnd: {
        addEventListener: (fn: () => void) => {
          moveEndListeners.add(fn);
        },
        removeEventListener: (fn: () => void) => {
          moveEndListeners.delete(fn);
        },
      },
    },
    fireCameraMoveEnd,
  };

  const rebuildPath = jest.fn<void, []>();
  const rebuildPathOnCameraMoveEnd = () => {
    rebuildPath();
  };
  viewer.camera.moveEnd.addEventListener(rebuildPathOnCameraMoveEnd);

  const controls = installOrbitCameraControls({
    Cesium,
    viewer: viewer as unknown as import("cesium").Viewer,
    ellipsoid: { maximumRadius: 6_371_000 } as import("cesium").Ellipsoid,
    radius: 6_371_000,
    initLat,
    initLong,
    width: 400,
    containerRef: { current: null },
    onOrbitRotateAnimationEnd: rebuildPathOnCameraMoveEnd,
  });

  const globeRef: Pick<GlobeViewportHandle, "animateTo" | "snapTo"> = {
    animateTo: (lat, long, durationMs) => controls.animateTo(lat, long, durationMs),
    snapTo: (lat, long) => controls.snapTo(lat, long),
  };

  rebuildPath.mockClear();

  return {
    globeRef,
    rebuildPath,
    fireCameraMoveEnd: viewer.fireCameraMoveEnd,
    destroy: () => {
      controls.destroy();
      viewer.camera.moveEnd.removeEventListener(rebuildPathOnCameraMoveEnd);
    },
  };
}

describe("globeRef path rebuild after camera moves", () => {
  let perfSpy: jest.SpyInstance<number, []>;
  let pendingRafs: FrameRequestCallback[];
  let perfNow = 0;
  let rafId = 0;

  beforeEach(() => {
    pendingRafs = [];
    perfNow = 0;
    rafId = 0;
    globalThis.requestAnimationFrame = (cb) => {
      pendingRafs.push(cb);
      rafId += 1;
      return rafId;
    };
    globalThis.cancelAnimationFrame = () => {};
    (globalThis as unknown as { window: Window }).window = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as unknown as Window;
    perfSpy = jest.spyOn(performance, "now").mockImplementation(() => perfNow);
  });

  afterEach(() => {
    perfSpy.mockRestore();
    delete (globalThis as { requestAnimationFrame?: typeof requestAnimationFrame })
      .requestAnimationFrame;
    delete (globalThis as { cancelAnimationFrame?: typeof cancelAnimationFrame })
      .cancelAnimationFrame;
    delete (globalThis as unknown as { window?: Window }).window;
  });

  /** Runs one generation of RAF callbacks at `atMs` (call again after duration to finish animations). */
  const flushRafGeneration = (atMs: number) => {
    perfNow = atMs;
    const batch = pendingRafs.splice(0, pendingRafs.length);
    for (const cb of batch) cb(atMs);
  };

  test("globeRef.animateTo() triggers Path rebuild when the rotation animation finishes", () => {
    const harness = installOrbitCameraPathRebuildHarness(0, 0);
    try {
      harness.rebuildPath.mockClear();
      harness.globeRef.animateTo(30, 45, 100);
      expect(harness.rebuildPath).not.toHaveBeenCalled();
      flushRafGeneration(0);
      expect(harness.rebuildPath).not.toHaveBeenCalled();
      flushRafGeneration(100);
      expect(harness.rebuildPath).toHaveBeenCalledTimes(1);
    } finally {
      harness.destroy();
    }
  });

  test("globeRef.animateTo() triggers Path rebuild immediately when already at the target", () => {
    const harness = installOrbitCameraPathRebuildHarness(12, 34);
    try {
      harness.rebuildPath.mockClear();
      harness.globeRef.animateTo(12, 34, 100);
      expect(harness.rebuildPath).toHaveBeenCalledTimes(1);
    } finally {
      harness.destroy();
    }
  });

  test("globeRef.snapTo() triggers Path rebuild via camera.moveEnd (same hook as GlobeViewport)", () => {
    const harness = installOrbitCameraPathRebuildHarness(0, 0);
    try {
      harness.rebuildPath.mockClear();
      harness.globeRef.snapTo(20, 50);
      harness.fireCameraMoveEnd();
      expect(harness.rebuildPath).toHaveBeenCalledTimes(1);
    } finally {
      harness.destroy();
    }
  });
});