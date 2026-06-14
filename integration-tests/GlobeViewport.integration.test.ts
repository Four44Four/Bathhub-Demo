import { Globe as GlobeConsts } from "../app/_client/ComponentConstants";
import { createUserSettingsDbSqlite } from "../app/_client/user-settings-db/UserSettingsDbSqlite";
import { resolveGlobeMovementSmooth } from "../app/_client/user-settings/useGlobeMovementSmooth";
import { USER_SETTINGS_DEFAULTS } from "../app/_shared/user-settings/UserSettingsSchema";
import {
  createGlobeOrbitHarness,
  expectedInitTargetRangeM,
  installGlobeAnimationTestEnv,
  nearlyEqualDegrees,
  nearlyEqualMeters,
  zoomIndicatorCenterFromPulse,
  type GlobeOrbitHarness,
} from "./globeIntegrationHelpers";

const { loadSqliteWasmModule } = require("./sqliteWasmLoader.cjs") as {
  loadSqliteWasmModule: () => Promise<import("../app/_client/local-db/web/LocalDbSqlite").SqliteWasm>;
};

function flushWheelZoomToIdle(
  anim: ReturnType<typeof installGlobeAnimationTestEnv>,
  harness: GlobeOrbitHarness,
  maxMs = 6000,
  stepMs = 16,
) {
  let prevRange = harness.readOrbitState().rangeM;
  let stableTicks = 0;
  for (let t = stepMs; t <= maxMs; t += stepMs) {
    anim.flushRaf(t);
    const nextRange = harness.readOrbitState().rangeM;
    if (Math.abs(nextRange - prevRange) < 0.05) {
      stableTicks += 1;
    } else {
      stableTicks = 0;
    }
    prevRange = nextRange;
    if (stableTicks >= 4) return;
  }
}

function   withHarness(
  options: Parameters<typeof createGlobeOrbitHarness>[0],
  run: (ctx: {
    harness: GlobeOrbitHarness;
    anim: ReturnType<typeof installGlobeAnimationTestEnv>;
  }) => void,
) {
  const anim = installGlobeAnimationTestEnv();
  const harness = createGlobeOrbitHarness(options);
  try {
    run({ harness, anim });
  } finally {
    harness.destroy();
    anim.restore();
  }
}

describe("Globe viewport Cesium integration (GlobeViewport + user settings specs)", () => {
  describe("3D orbit invariants (camera orientation)", () => {
    test("camera always looks at globe center after pan and zoom interactions", () => {
      withHarness({ initLat: 20, initLong: 30, width: 800 }, ({ harness }) => {
        const assertLooksAtCenter = () => {
          expect(harness.readCameraOrientation().looksAtCenter).toBe(true);
        };

        assertLooksAtCenter();
        harness.simulateLeftDrag(80, 40);
        assertLooksAtCenter();
        harness.simulateWheel(-120);
        assertLooksAtCenter();
        harness.simulateRightDragZoom(-60);
        assertLooksAtCenter();
        harness.simulatePinchMove({ startDist: 120, endDist: 180 });
        assertLooksAtCenter();
      });
    });

    test("camera up vector stays perpendicular to view direction", () => {
      withHarness({ initLat: 45, initLong: -75, width: 800 }, ({ harness }) => {
        harness.simulateLeftDrag(120, -30);
        const { directionUnit, upUnit } = harness.readCameraOrientation();
        const dot = Math.abs(
          directionUnit.x * upUnit.x +
            directionUnit.y * upUnit.y +
            directionUnit.z * upUnit.z,
        );
        expect(dot).toBeLessThan(0.02);
      });
    });
  });

  describe("panning — left drag / single finger (GlobeViewport spec §1)", () => {
    test("horizontal left-drag changes viewport-center longitude", () => {
      withHarness({ initLat: 0, initLong: 0, width: 800 }, ({ harness }) => {
        const before = harness.readOrbitState();
        harness.simulateLeftDrag(100, 0);
        const after = harness.readOrbitState();
        expect(after.viewportCenterLonDeg).not.toBeCloseTo(before.viewportCenterLonDeg, 1);
        expect(after.viewportCenterLatDeg).toBeCloseTo(before.viewportCenterLatDeg, 0);
      });
    });

    test("vertical left-drag changes viewport-center latitude", () => {
      withHarness({ initLat: 10, initLong: 0, width: 800 }, ({ harness }) => {
        const before = harness.readOrbitState();
        harness.simulateLeftDrag(0, 80);
        const after = harness.readOrbitState();
        expect(after.viewportCenterLatDeg).not.toBeCloseTo(before.viewportCenterLatDeg, 1);
      });
    });
  });

  describe("zooming — wheel, right-drag, pinch (GlobeViewport spec §2–4)", () => {
    test("mouse wheel forward (negative deltaY) brings camera closer to the surface", () => {
      withHarness({ width: "100%" }, ({ harness, anim }) => {
        const before = harness.readOrbitState().surfaceClearanceM;
        harness.simulateWheel(-150);
        flushWheelZoomToIdle(anim, harness);
        const after = harness.readOrbitState().surfaceClearanceM;
        expect(after).toBeLessThan(before);
      });
    });

    test("mouse wheel backward (positive deltaY) moves camera farther from the surface", () => {
      withHarness({ width: "100%" }, ({ harness, anim }) => {
        const before = harness.readOrbitState().surfaceClearanceM;
        harness.simulateWheel(150);
        flushWheelZoomToIdle(anim, harness);
        const after = harness.readOrbitState().surfaceClearanceM;
        expect(after).toBeGreaterThan(before);
      });
    });

    test("right-drag up zooms in (decreases surface clearance)", () => {
      withHarness({ width: 800 }, ({ harness }) => {
        const before = harness.readOrbitState().surfaceClearanceM;
        harness.simulateRightDragZoom(-80);
        const after = harness.readOrbitState().surfaceClearanceM;
        expect(after).toBeLessThan(before);
      });
    });

    test("right-drag down zooms out (increases surface clearance)", () => {
      withHarness({ width: 800 }, ({ harness }) => {
        const before = harness.readOrbitState().surfaceClearanceM;
        harness.simulateRightDragZoom(80);
        const after = harness.readOrbitState().surfaceClearanceM;
        expect(after).toBeGreaterThan(before);
      });
    });

    test("pinch-in decreases surface clearance", () => {
      withHarness({ width: 800 }, ({ harness }) => {
        const before = harness.readOrbitState().surfaceClearanceM;
        harness.simulatePinchMove({ startDist: 200, endDist: 260 });
        const after = harness.readOrbitState().surfaceClearanceM;
        expect(after).toBeLessThan(before);
      });
    });

    test("pinch-out increases surface clearance", () => {
      withHarness({ width: 800 }, ({ harness }) => {
        const before = harness.readOrbitState().surfaceClearanceM;
        harness.simulatePinchMove({ startDist: 260, endDist: 200 });
        const after = harness.readOrbitState().surfaceClearanceM;
        expect(after).toBeGreaterThan(before);
      });
    });

    test("two-finger pinch can change zoom and viewport center in one gesture", () => {
      withHarness({ initLat: 5, initLong: 10, width: 800 }, ({ harness }) => {
        const before = harness.readOrbitState();
        harness.simulatePinchMove({
          startDist: 180,
          endDist: 260,
          panVx: 4,
        });
        const after = harness.readOrbitState();
        expect(after.surfaceClearanceM).toBeLessThan(before.surfaceClearanceM);
        const panDelta =
          Math.abs(after.viewportCenterLonDeg - before.viewportCenterLonDeg) +
          Math.abs(after.viewportCenterLatDeg - before.viewportCenterLatDeg);
        expect(panDelta).toBeGreaterThan(0.0005);
      });
    });

    test("minimum surface clearance is enforced at maximum zoom-in", () => {
      withHarness({ width: 800 }, ({ harness, anim }) => {
        for (let i = 0; i < 40; i++) {
          harness.simulateWheel(-500);
          flushWheelZoomToIdle(anim, harness, 4000);
        }
        const clearance = harness.readOrbitState().surfaceClearanceM;
        expect(clearance).toBeGreaterThanOrEqual(GlobeConsts.MIN_SURFACE_CLEARANCE_M - 0.5);
        expect(clearance).toBeLessThanOrEqual(GlobeConsts.MIN_SURFACE_CLEARANCE_M + 1);
      });
    });
  });

  describe("zoom indicator placement (GlobeViewport spec §5)", () => {
    test("wheel zoom pulses indicator at cursor position in container space", () => {
      withHarness({ containerLeft: 40, containerTop: 60, width: 800 }, ({ harness }) => {
        const cursorX = 40 + 220;
        const cursorY = 60 + 310;
        harness.simulateWheel(-80, cursorX, cursorY);
        expect(harness.zoomPulses.length).toBeGreaterThan(0);
        const pulse = harness.zoomPulses[0]!;
        expect(pulse.x).toBeCloseTo(220, 0);
        expect(pulse.y).toBeCloseTo(310, 0);
        const layout = zoomIndicatorCenterFromPulse(pulse.x, pulse.y);
        expect(layout.left).toBe(211);
        expect(layout.top).toBe(301);
      });
    });

    test("pinch zoom pulses indicator at finger midpoint", () => {
      withHarness({ containerLeft: 0, containerTop: 0, width: 800 }, ({ harness }) => {
        const midX = 400;
        const midY = 300;
        harness.simulatePinchMove({
          startDist: 100,
          endDist: 140,
          midClientX: midX,
          midClientY: midY,
        });
        expect(harness.zoomPulses.length).toBeGreaterThan(0);
        const pulse = harness.zoomPulses[0]!;
        expect(pulse.x).toBeCloseTo(400, 0);
        expect(pulse.y).toBeCloseTo(300, 0);
      });
    });
  });

  describe("tap / click picking (GlobeViewport spec §7–8)", () => {
    test("tap on globe reports a picked lat/lon (ClickedIndicator source)", () => {
      withHarness({ initLat: 12, initLong: 34, width: 800 }, ({ harness }) => {
        expect(harness.clickLatLon).toHaveLength(0);
        harness.simulateTap();
        expect(harness.clickLatLon).toHaveLength(1);
        const pick = harness.clickLatLon[0]!;
        expect(Number.isFinite(pick.lat)).toBe(true);
        expect(Number.isFinite(pick.lon)).toBe(true);
      });
    });
  });

  describe('user settings — Init camera height (meters) (user_settings spec §90–96)', () => {
    const OFFSETS_M = [500, 1500, 10_000] as const;

    test.each(OFFSETS_M)(
      "snapZoomToInitTarget places camera %.0fm above surface when offset is %im",
      (offsetM) => {
        withHarness(
          {
            cameraInitSurfaceOffsetM: offsetM,
            startAtInitTargetRange: true,
            initLat: 51.5,
            initLong: -0.12,
            width: "100%",
          },
          ({ harness }) => {
            harness.controls.snapZoomToInitTarget();
            const clearance = harness.readOrbitState().surfaceClearanceM;
            const expected = expectedInitTargetRangeM(offsetM) - harness.radiusM;
            expect(nearlyEqualMeters(clearance, expected)).toBe(true);
          },
        );
      },
    );

    test("pre-granted geolocation load (startAtInitTargetRange) starts at configured height, not default far view", () => {
      const offsetM = 7500;
      withHarness(
        {
          cameraInitSurfaceOffsetM: offsetM,
          startAtInitTargetRange: true,
          initLat: 40.7,
          initLong: -74.0,
          width: "100%",
        },
        ({ harness }) => {
          const clearance = harness.readOrbitState().surfaceClearanceM;
          expect(nearlyEqualMeters(clearance, offsetM)).toBe(true);
          const farHarness = createGlobeOrbitHarness({
            cameraInitSurfaceOffsetM: offsetM,
            startAtInitTargetRange: false,
            initLat: 40.7,
            initLong: -74.0,
            width: "100%",
          });
          try {
            const farClearance = farHarness.readOrbitState().surfaceClearanceM;
            expect(clearance).toBeLessThan(farClearance * 0.5);
          } finally {
            farHarness.destroy();
          }
        },
      );
    });

    test("setCameraInitSurfaceOffsetM updates snap target after settings change", () => {
      withHarness(
        {
          cameraInitSurfaceOffsetM: USER_SETTINGS_DEFAULTS.camera_init_surface_offset_m,
          width: 800,
        },
        ({ harness }) => {
          harness.controls.setCameraInitSurfaceOffsetM(5000);
          harness.controls.snapZoomToInitTarget();
          const clearance = harness.readOrbitState().surfaceClearanceM;
          expect(nearlyEqualMeters(clearance, 5000)).toBe(true);
        },
      );
    });

    test("SQLite user_settings camera_init_surface_offset_m drives orbit init target in app flow", async () => {
      const db = createUserSettingsDbSqlite({
        initSqliteWasm: loadSqliteWasmModule,
      });
      await db.init();
      await db.updateIntSetting("camera_init_surface_offset_m", 3200);
      const settings = await db.getSettings();
      expect(settings.camera_init_surface_offset_m).toBe(3200);

      withHarness(
        {
          cameraInitSurfaceOffsetM: settings.camera_init_surface_offset_m,
          startAtInitTargetRange: true,
          width: "100%",
        },
        ({ harness }) => {
          harness.controls.snapZoomToInitTarget();
          expect(
            nearlyEqualMeters(harness.readOrbitState().surfaceClearanceM, 3200),
          ).toBe(true);
        },
      );
    });
  });

  describe("user settings — Globe movement smooth animations (user_settings spec §85–89)", () => {
    test("globe_movement_smooth=true animates rotation and zoom toward geo target over duration", () => {
      withHarness(
        {
          cameraInitSurfaceOffsetM: 2000,
          width: "100%",
        },
        ({ harness, anim }) => {
          const targetLat = 48.85;
          const targetLon = 2.35;
          harness.runSmoothGeoNavigation({
            lat: targetLat,
            lon: targetLon,
            globeMovementSmooth: true,
            durationMs: GlobeConsts.ANIMATE_ON_INIT_DURA,
          });

          const mid = harness.readOrbitState();
          expect(
            nearlyEqualDegrees(mid.viewportCenterLatDeg, targetLat) ||
              nearlyEqualDegrees(mid.viewportCenterLonDeg, targetLon),
          ).toBe(false);

          anim.flushRaf(0);
          anim.flushRaf(GlobeConsts.ANIMATE_ON_INIT_DURA);
          flushWheelZoomToIdle(anim, harness, 8000);

          const end = harness.readOrbitState();
          expect(nearlyEqualDegrees(end.viewportCenterLatDeg, targetLat)).toBe(true);
          expect(nearlyEqualDegrees(end.viewportCenterLonDeg, targetLon)).toBe(true);
          expect(nearlyEqualMeters(end.surfaceClearanceM, 2000)).toBe(true);
        },
      );
    });

    test("globe_movement_smooth=false snaps rotation and zoom immediately", () => {
      withHarness(
        {
          cameraInitSurfaceOffsetM: 1800,
          width: "100%",
        },
        ({ harness, anim }) => {
          const targetLat = 35.68;
          const targetLon = 139.69;
          harness.runSmoothGeoNavigation({
            lat: targetLat,
            lon: targetLon,
            globeMovementSmooth: false,
          });

          anim.flushRaf(0);
          const end = harness.readOrbitState();
          expect(nearlyEqualDegrees(end.viewportCenterLatDeg, targetLat)).toBe(true);
          expect(nearlyEqualDegrees(end.viewportCenterLonDeg, targetLon)).toBe(true);
          expect(nearlyEqualMeters(end.surfaceClearanceM, 1800)).toBe(true);
        },
      );
    });

    test("resolveGlobeMovementSmooth reads persisted SQLite globe_movement_smooth", async () => {
      const db = createUserSettingsDbSqlite({
        initSqliteWasm: loadSqliteWasmModule,
      });
      await db.init();
      await db.updateBooleanSetting("globe_movement_smooth", false);
      const settings = await db.getSettings();
      expect(resolveGlobeMovementSmooth(settings)).toBe(false);
      expect(resolveGlobeMovementSmooth(null)).toBe(
        USER_SETTINGS_DEFAULTS.globe_movement_smooth,
      );
    });

    test("smooth geolocation navigation locks user orbit input for ANIMATE_ON_INIT_DURA", () => {
      withHarness({ width: 800 }, ({ harness, anim }) => {
        harness.runSmoothGeoNavigation({
          lat: 10,
          lon: 20,
          globeMovementSmooth: true,
        });
        expect(harness._isGeoInputAllowed()).toBe(false);

        const before = harness.readOrbitState().viewportCenterLonDeg;
        harness.simulateLeftDrag(60, 0);
        const during = harness.readOrbitState().viewportCenterLonDeg;
        expect(during).toBeCloseTo(before, 5);

        harness._advanceGeoLock(GlobeConsts.ANIMATE_ON_INIT_DURA);
        expect(harness._isGeoInputAllowed()).toBe(true);

        harness.simulateLeftDrag(60, 0);
        const after = harness.readOrbitState().viewportCenterLonDeg;
        expect(after).not.toBeCloseTo(before, 1);

        anim.flushRaf(GlobeConsts.ANIMATE_ON_INIT_DURA);
      });
    });

    test("snap geolocation navigation does not lock user orbit input", () => {
      withHarness({ width: 800, initLat: 0, initLong: 0 }, ({ harness, anim }) => {
        harness.runSmoothGeoNavigation({
          lat: 10,
          lon: 20,
          globeMovementSmooth: false,
        });
        expect(harness._isGeoInputAllowed()).toBe(true);
        const clearanceBefore = harness.readOrbitState().surfaceClearanceM;
        harness.simulateWheel(-120);
        flushWheelZoomToIdle(anim, harness);
        expect(harness.readOrbitState().surfaceClearanceM).toBeLessThan(clearanceBefore);
      });
    });
  });

  describe("geolocation recenter spatial conformance (GlobeViewport spec §10–14, §25)", () => {
    test("recenter navigation centers viewport on geolocation at init camera height", () => {
      withHarness(
        {
          cameraInitSurfaceOffsetM: 4200,
          width: "100%",
        },
        ({ harness, anim }) => {
          harness.simulateLeftDrag(200, 100);
          harness.simulateWheel(200);
          flushWheelZoomToIdle(anim, harness);

          const geoLat = 37.77;
          const geoLon = -122.42;
          harness.runSmoothGeoNavigation({
            lat: geoLat,
            lon: geoLon,
            globeMovementSmooth: false,
          });

          const state = harness.readOrbitState();
          expect(nearlyEqualDegrees(state.viewportCenterLatDeg, geoLat)).toBe(true);
          expect(nearlyEqualDegrees(state.viewportCenterLonDeg, geoLon)).toBe(true);
          expect(nearlyEqualMeters(state.surfaceClearanceM, 4200)).toBe(true);
        },
      );
    });
  });
});
