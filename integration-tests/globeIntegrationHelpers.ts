import { Globe as GlobeConsts } from "../app/_client/ComponentConstants";
import {
  installOrbitCameraControls,
  type InstalledOrbitCameraControls,
} from "../app/_client/globe/Camera";
import * as GeoArrival from "../app/_client/pure/globe/GeoArrivalCameraLock";
import { navigateGlobeToLatLon } from "../app/_client/pure/globe/GlobeMovementNavigation";
import * as OrbitCam from "../app/_client/pure/globe/OrbitCamera";
import {
  zoomIndicatorSquareTopLeftCss,
} from "../app/_client/pure/viewport2d/ZoomIndicator";
import { USER_SETTINGS_DEFAULTS } from "../app/_shared/user-settings/UserSettingsSchema";

export const EARTH_RADIUS_M = 6_371_000;
export const ORBIT_DIST_EPSILON_M = 1.0;
export const ORBIT_ANGLE_EPSILON_DEG = 0.05;

export function nearlyEqualMeters(actual: number, expected: number, epsilon = ORBIT_DIST_EPSILON_M): boolean {
  return Math.abs(actual - expected) <= epsilon;
}

export function nearlyEqualDegrees(actual: number, expected: number, epsilon = ORBIT_ANGLE_EPSILON_DEG): boolean {
  const d = Math.abs(actual - expected);
  return d <= epsilon || Math.abs(d - 360) <= epsilon;
}

type Vec3 = { x: number; y: number; z: number };

function vecLen(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

function vecDot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vecNormalize(v: Vec3): Vec3 {
  const len = vecLen(v) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export type OrbitStateSnapshot = {
  thetaRad: number;
  phiRad: number;
  rangeM: number;
  surfaceClearanceM: number;
  viewportCenterLatDeg: number;
  viewportCenterLonDeg: number;
};

export type GlobeOrbitHarnessOptions = {
  initLat?: number;
  initLong?: number;
  width?: number | string;
  cameraInitSurfaceOffsetM?: number;
  startAtInitTargetRange?: boolean;
  containerLeft?: number;
  containerTop?: number;
};

export type GlobeOrbitHarness = {
  controls: InstalledOrbitCameraControls;
  radiusM: number;
  zoomPulses: { x: number; y: number }[];
  clickLatLon: { lat: number; lon: number }[];
  readOrbitState: () => OrbitStateSnapshot;
  readCameraOrientation: () => {
    looksAtCenter: boolean;
    directionUnit: Vec3;
    upUnit: Vec3;
  };
  simulateLeftDrag: (dxPx: number, dyPx: number, pointerId?: number) => void;
  simulateRightDragZoom: (dyPx: number, pointerId?: number) => void;
  simulateWheel: (deltaY: number, clientX?: number, clientY?: number) => void;
  simulatePinchMove: (args: {
    startDist: number;
    endDist: number;
    midClientX?: number;
    midClientY?: number;
    pointerIds?: [number, number];
    panVx?: number;
    panVy?: number;
  }) => void;
  simulateTap: (clientX?: number, clientY?: number, pointerId?: number) => void;
  runSmoothGeoNavigation: (args: {
    lat: number;
    lon: number;
    globeMovementSmooth: boolean;
    durationMs?: number;
    beginGeoArrivalLock?: () => void;
    isUserInputAllowed?: () => boolean;
  }) => void;
  destroy: () => void;
  /** Test-only geo-arrival lock helpers. */
  _advanceGeoLock: (nowMs: number) => void;
  _isGeoInputAllowed: () => boolean;
};

type PinchHandler = ((e: unknown) => void) | null;

/** Rich Cesium stand-in wired to real `installOrbitCameraControls` for integration tests. */
export function createGlobeOrbitHarness(
  options: GlobeOrbitHarnessOptions = {},
): GlobeOrbitHarness {
  const initLat = options.initLat ?? 0;
  const initLong = options.initLong ?? 0;
  const width = options.width ?? 800;
  const cameraInitSurfaceOffsetM =
    options.cameraInitSurfaceOffsetM ?? USER_SETTINGS_DEFAULTS.camera_init_surface_offset_m;
  const startAtInitTargetRange = options.startAtInitTargetRange ?? false;
  const containerLeft = options.containerLeft ?? 0;
  const containerTop = options.containerTop ?? 0;

  const radiusM = EARTH_RADIUS_M;
  let lastViewDir: Vec3 = OrbitCam.orbitUnitDirectionFromAngles(
    OrbitCam.degreesToRadians(initLong),
    OrbitCam.degreesToRadians(initLat),
  );
  let lastRangeM = radiusM * 3;

  const zoomPulses: { x: number; y: number }[] = [];
  const clickLatLon: { lat: number; lon: number }[] = [];

  const pinchHandlers: Record<number, PinchHandler> = {
    1: null,
    2: null,
    3: null,
  };

  class Cartesian3 implements Vec3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    static multiplyByScalar(c: Vec3, s: number, result: Cartesian3) {
      result.x = c.x * s;
      result.y = c.y * s;
      result.z = c.z * s;
      return result;
    }
    static negate(c: Vec3, result: Cartesian3) {
      result.x = -c.x;
      result.y = -c.y;
      result.z = -c.z;
      return result;
    }
    static normalize(c: Vec3, result: Cartesian3) {
      const n = vecNormalize(c);
      result.x = n.x;
      result.y = n.y;
      result.z = n.z;
      return result;
    }
  }

  class Cartographic {
    latitude: number;
    longitude: number;
    height: number;
    constructor(longitude = 0, latitude = 0, height = 0) {
      this.longitude = longitude;
      this.latitude = latitude;
      this.height = height;
    }
    static fromCartesian(cartesian: Vec3, _ellipsoid: unknown, result?: Cartographic) {
      const n = vecNormalize(cartesian);
      const tp = OrbitCam.sphericalDirToThetaPhi(n);
      const out = result ?? new Cartographic();
      out.longitude = tp.theta;
      out.latitude = tp.phi;
      out.height = vecLen(cartesian) - radiusM;
      return out;
    }
  }

  const Cesium = {
    Matrix4: { IDENTITY: {} },
    Cartesian3,
    Cartesian2: class {
      constructor(
        public x: number,
        public y: number,
      ) {}
    },
    Cartographic,
    defined: (v: unknown) => v !== undefined && v !== null,
    Math: {
      toDegrees: (radians: number) => (radians * 180) / Math.PI,
      toRadians: (degrees: number) => (degrees * Math.PI) / 180,
    },
    ScreenSpaceEventHandler: class {
      setInputAction(fn: PinchHandler, type: number) {
        pinchHandlers[type] = fn;
      }
      destroy() {}
    },
    ScreenSpaceEventType: {
      PINCH_START: 1,
      PINCH_MOVE: 2,
      PINCH_END: 3,
    },
  } as unknown as typeof import("cesium");

  const canvas = {
    style: { touchAction: "" as string },
    clientWidth: typeof width === "number" ? width : 800,
    clientHeight: 600,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setPointerCapture: jest.fn(),
    getBoundingClientRect: () => ({
      left: containerLeft,
      top: containerTop,
      width: typeof width === "number" ? width : 800,
      height: 600,
    }),
  };

  const containerEl = {
    getBoundingClientRect: () => ({
      left: containerLeft,
      top: containerTop,
      width: typeof width === "number" ? width : 800,
      height: 600,
    }),
  };

  const positionCartographic = {
    height: lastRangeM - radiusM,
    latitude: OrbitCam.degreesToRadians(initLat),
    longitude: OrbitCam.degreesToRadians(initLong),
  };

  const surfacePointFromScreen = (screenX: number, screenY: number): Vec3 => {
    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    const frustumFovy = Math.PI / 3;
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const fovx = OrbitCam.horizontalFovFromVerticalAndAspect(frustumFovy, aspect);
    const dx = (screenX - cx) / Math.max(1, cx);
    const dy = (screenY - cy) / Math.max(1, cy);
    const tp = OrbitCam.sphericalDirToThetaPhi(lastViewDir);
    const dTheta = -dx * (fovx / 2);
    const dPhi = dy * (frustumFovy / 2);
    const dir = OrbitCam.orbitUnitDirectionFromAngles(tp.theta + dTheta, tp.phi + dPhi);
    return {
      x: dir.x * radiusM,
      y: dir.y * radiusM,
      z: dir.z * radiusM,
    };
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
        maximumZoomDistance: radiusM * 20,
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
      frustum: { fovy: Math.PI / 3, aspectRatio: canvas.clientWidth / canvas.clientHeight },
      positionCartographic,
      pickEllipsoid: (pos: { x: number; y: number }) => {
        const p = surfacePointFromScreen(pos.x, pos.y);
        return new Cartesian3(p.x, p.y, p.z);
      },
      getPickRay: () => null,
      lookAtTransform: jest.fn(),
      setView: (opts: {
        destination: Vec3;
        orientation: { direction: Vec3; up: Vec3 };
      }) => {
        const dest = opts.destination;
        lastRangeM = vecLen(dest);
        lastViewDir = vecNormalize(dest);
        const tp = OrbitCam.sphericalDirToThetaPhi(lastViewDir);
        positionCartographic.height = Math.max(0, lastRangeM - radiusM);
        positionCartographic.latitude = tp.phi;
        positionCartographic.longitude = tp.theta;
      },
      moveEnd: {
        listeners: new Set<() => void>(),
        addEventListener(fn: () => void) {
          this.listeners.add(fn);
        },
        removeEventListener(fn: () => void) {
          this.listeners.delete(fn);
        },
      },
    },
  };

  let geoLockState = GeoArrival.initialGeoArrivalLockState();

  const controls = installOrbitCameraControls({
    Cesium,
    viewer: viewer as unknown as import("cesium").Viewer,
    ellipsoid: { maximumRadius: radiusM } as import("cesium").Ellipsoid,
    radius: radiusM,
    initLat,
    initLong,
    width,
    cameraInitSurfaceOffsetM,
    startAtInitTargetRange,
    containerRef: { current: containerEl as unknown as HTMLElement },
    zoomIndicatorRootRef: { current: containerEl as unknown as HTMLElement },
    onZoomIndicatorPulse: (x, y) => {
      zoomPulses.push({ x, y });
    },
    onClickLatLonDegrees: (lat, lon) => {
      clickLatLon.push({ lat, lon });
    },
    isUserGlobeOrbitInputAllowed: () => GeoArrival.isGlobeOrbitUserInputAllowed(geoLockState),
  });

  const readOrbitStateFixed = (): OrbitStateSnapshot => {
    const tp = OrbitCam.sphericalDirToThetaPhi(lastViewDir);
    return {
      thetaRad: tp.theta,
      phiRad: tp.phi,
      rangeM: lastRangeM,
      surfaceClearanceM: lastRangeM - radiusM,
      viewportCenterLatDeg: (tp.phi * 180) / Math.PI,
      viewportCenterLonDeg: (tp.theta * 180) / Math.PI,
    };
  };

  const readCameraOrientation = () => {
    const dest = {
      x: lastViewDir.x * lastRangeM,
      y: lastViewDir.y * lastRangeM,
      z: lastViewDir.z * lastRangeM,
    };
    const direction = vecNormalize({ x: -lastViewDir.x, y: -lastViewDir.y, z: -lastViewDir.z });
    const up = OrbitCam.globeOrbitCameraUpWorldFromDir(lastViewDir);
    const destUnit = vecNormalize(dest);
    return {
      looksAtCenter: Math.abs(vecDot(destUnit, direction) + 1) < 1e-4,
      directionUnit: direction,
      upUnit: up,
    };
  };

  const getPointerListener = (type: string) => {
    const match = (canvas.addEventListener as jest.Mock).mock.calls.find(([name]) => name === type);
    return match?.[1] as ((e: PointerEvent) => void) | undefined;
  };

  const getWheelListener = () => {
    const match = (canvas.addEventListener as jest.Mock).mock.calls.find(([name]) => name === "wheel");
    return match?.[1] as ((e: WheelEvent) => void) | undefined;
  };

  const makePointerEvent = (
    type: string,
    init: {
      pointerId: number;
      button?: number;
      clientX?: number;
      clientY?: number;
      pointerType?: string;
      timeStamp?: number;
      bubbles?: boolean;
      cancelable?: boolean;
    },
  ) => new (globalThis.PointerEvent as unknown as new (
    type: string,
    init: Record<string, unknown>,
  ) => PointerEvent)(type, init);

  const simulateLeftDrag = (dxPx: number, dyPx: number, pointerId = 1) => {
    const down = getPointerListener("pointerdown");
    const move = getPointerListener("pointermove");
    const up = getPointerListener("pointerup");
    if (!down || !move || !up) throw new Error("pointer listeners not installed");

    const x0 = containerLeft + canvas.clientWidth / 2;
    const y0 = containerTop + canvas.clientHeight / 2;
    down(
      makePointerEvent("pointerdown", {
        pointerId,
        button: 0,
        clientX: x0,
        clientY: y0,
        pointerType: "mouse",
        bubbles: true,
        cancelable: true,
      }),
    );
    move(
      makePointerEvent("pointermove", {
        pointerId,
        clientX: x0 + dxPx,
        clientY: y0 + dyPx,
        pointerType: "mouse",
        timeStamp: 32,
        bubbles: true,
        cancelable: true,
      }),
    );
    up(
      makePointerEvent("pointerup", {
        pointerId,
        button: 0,
        clientX: x0 + dxPx,
        clientY: y0 + dyPx,
        pointerType: "mouse",
        bubbles: true,
        cancelable: true,
      }),
    );
  };

  const simulateRightDragZoom = (dyPx: number, pointerId = 2) => {
    const down = getPointerListener("pointerdown");
    const move = getPointerListener("pointermove");
    const up = getPointerListener("pointerup");
    if (!down || !move || !up) throw new Error("pointer listeners not installed");

    const x0 = containerLeft + canvas.clientWidth / 2;
    const y0 = containerTop + canvas.clientHeight / 2;
    down(
      makePointerEvent("pointerdown", {
        pointerId,
        button: 2,
        clientX: x0,
        clientY: y0,
        pointerType: "mouse",
        bubbles: true,
        cancelable: true,
      }),
    );
    move(
      makePointerEvent("pointermove", {
        pointerId,
        clientX: x0,
        clientY: y0 + dyPx,
        pointerType: "mouse",
        timeStamp: 32,
        bubbles: true,
        cancelable: true,
      }),
    );
    up(
      makePointerEvent("pointerup", {
        pointerId,
        button: 2,
        clientX: x0,
        clientY: y0 + dyPx,
        pointerType: "mouse",
        bubbles: true,
        cancelable: true,
      }),
    );
  };

  const simulateWheel = (deltaY: number, clientX?: number, clientY?: number) => {
    const wheel = getWheelListener();
    if (!wheel) throw new Error("wheel listener not installed");
    const cx = clientX ?? containerLeft + canvas.clientWidth / 2;
    const cy = clientY ?? containerTop + canvas.clientHeight / 2;
    wheel(
      new (globalThis.WheelEvent as unknown as new (
        type: string,
        init: Record<string, unknown>,
      ) => WheelEvent)("wheel", {
        deltaY,
        clientX: cx,
        clientY: cy,
        bubbles: true,
        cancelable: true,
      }),
    );
  };

  const simulatePinchMove = (args: {
    startDist: number;
    endDist: number;
    midClientX?: number;
    midClientY?: number;
    pointerIds?: [number, number];
    panVx?: number;
    panVy?: number;
  }) => {
    const [idA, idB] = args.pointerIds ?? [10, 11];
    const down = getPointerListener("pointerdown");
    const move = getPointerListener("pointermove");
    if (!down || !move) throw new Error("pointer listeners not installed");

    const midX = args.midClientX ?? containerLeft + canvas.clientWidth / 2;
    const midY = args.midClientY ?? containerTop + canvas.clientHeight / 2;
    const half = args.startDist / 2;

    down(
      makePointerEvent("pointerdown", {
        pointerId: idA,
        clientX: midX - half,
        clientY: midY,
        pointerType: "touch",
        timeStamp: 0,
        bubbles: true,
        cancelable: true,
      }),
    );
    down(
      makePointerEvent("pointerdown", {
        pointerId: idB,
        clientX: midX + half,
        clientY: midY,
        pointerType: "touch",
        timeStamp: 0,
        bubbles: true,
        cancelable: true,
      }),
    );

    const panShift = args.panVx !== undefined ? args.panVx * 48 : 0;
    const pinchStart = pinchHandlers[1];
    pinchStart?.({
      position1: { x: midX - half - containerLeft, y: midY - containerTop },
      position2: { x: midX + half - containerLeft, y: midY - containerTop },
    });

    const pinchMove = pinchHandlers[2];
    pinchMove?.({
      distance: {
        startDistance: args.startDist,
        currentDistance: args.endDist,
      },
    });

    if (panShift !== 0) {
      move(
        makePointerEvent("pointermove", {
          pointerId: idA,
          clientX: midX - args.endDist / 2 + panShift,
          clientY: midY,
          pointerType: "touch",
          timeStamp: 80,
          bubbles: true,
          cancelable: true,
        }),
      );
      move(
        makePointerEvent("pointermove", {
          pointerId: idB,
          clientX: midX + args.endDist / 2 + panShift,
          clientY: midY,
          pointerType: "touch",
          timeStamp: 80,
          bubbles: true,
          cancelable: true,
        }),
      );
      pinchMove?.({
        distance: {
          startDistance: args.endDist,
          currentDistance: args.endDist,
        },
      });
    }

    pinchHandlers[3]?.({});
  };

  const simulateTap = (clientX?: number, clientY?: number, pointerId = 3) => {
    const down = getPointerListener("pointerdown");
    const up = getPointerListener("pointerup");
    if (!down || !up) throw new Error("pointer listeners not installed");
    const x = clientX ?? containerLeft + canvas.clientWidth / 2;
    const y = clientY ?? containerTop + canvas.clientHeight / 2;
    down(
      makePointerEvent("pointerdown", {
        pointerId,
        button: 0,
        clientX: x,
        clientY: y,
        pointerType: "mouse",
        bubbles: true,
        cancelable: true,
      }),
    );
    up(
      makePointerEvent("pointerup", {
        pointerId,
        button: 0,
        clientX: x,
        clientY: y,
        pointerType: "mouse",
        bubbles: true,
        cancelable: true,
      }),
    );
  };

  const runSmoothGeoNavigation = (args: {
    lat: number;
    lon: number;
    globeMovementSmooth: boolean;
    durationMs?: number;
    beginGeoArrivalLock?: () => void;
    isUserInputAllowed?: () => boolean;
  }) => {
    const durationMs = args.durationMs ?? GlobeConsts.ANIMATE_ON_INIT_DURA;
    if (args.globeMovementSmooth) {
      geoLockState = GeoArrival.beginGeoArrivalLock(
        geoLockState,
        0,
        durationMs,
      );
      args.beginGeoArrivalLock?.();
    }
    navigateGlobeToLatLon(
      {
        globe: {
          beginGeoArrivalInteractionLock: () => {
            geoLockState = GeoArrival.beginGeoArrivalLock(geoLockState, 0, durationMs);
          },
          animateTo: controls.animateTo,
          animateZoomToInitTarget: controls.animateZoomToInitTarget,
          snapTo: controls.snapTo,
          snapZoomToInitTarget: controls.snapZoomToInitTarget,
        },
        globeMovementSmooth: args.globeMovementSmooth,
        animationDurationMs: durationMs,
      },
      args.lat,
      args.lon,
    );
  };

  return {
    controls,
    radiusM,
    zoomPulses,
    clickLatLon,
    readOrbitState: readOrbitStateFixed,
    readCameraOrientation,
    simulateLeftDrag,
    simulateRightDragZoom,
    simulateWheel,
    simulatePinchMove,
    simulateTap,
    runSmoothGeoNavigation,
    destroy: () => {
      controls.destroy();
    },
    /** Test-only: advance geo-arrival lock clock. */
    _advanceGeoLock: (nowMs: number) => {
      geoLockState = GeoArrival.reduceGeoArrivalLockForTick(geoLockState, nowMs);
    },
    _isGeoInputAllowed: () => GeoArrival.isGlobeOrbitUserInputAllowed(geoLockState),
  };
}

/** RAF + performance harness for wheel/rotate animation integration tests. */
export function installGlobeAnimationTestEnv(): {
  flushRaf: (atMs: number) => void;
  setPerfNow: (ms: number) => void;
  restore: () => void;
} {
  let perfNow = 0;
  let rafId = 0;
  const pendingRafs: FrameRequestCallback[] = [];

  class MockPointerEvent {
    pointerId: number;
    button: number;
    clientX: number;
    clientY: number;
    pointerType: string;
    timeStamp: number;
    bubbles: boolean;
    cancelable: boolean;
    constructor(
      _type: string,
      init: {
        pointerId: number;
        button?: number;
        clientX?: number;
        clientY?: number;
        pointerType?: string;
        timeStamp?: number;
        bubbles?: boolean;
        cancelable?: boolean;
      },
    ) {
      this.pointerId = init.pointerId;
      this.button = init.button ?? 0;
      this.clientX = init.clientX ?? 0;
      this.clientY = init.clientY ?? 0;
      this.pointerType = init.pointerType ?? "mouse";
      this.timeStamp = init.timeStamp ?? 0;
      this.bubbles = init.bubbles ?? true;
      this.cancelable = init.cancelable ?? true;
    }
    preventDefault() {}
  }

  class MockWheelEvent {
    deltaY: number;
    clientX: number;
    clientY: number;
    bubbles: boolean;
    cancelable: boolean;
    constructor(
      _type: string,
      init: {
        deltaY?: number;
        clientX?: number;
        clientY?: number;
        bubbles?: boolean;
        cancelable?: boolean;
      },
    ) {
      this.deltaY = init.deltaY ?? 0;
      this.clientX = init.clientX ?? 0;
      this.clientY = init.clientY ?? 0;
      this.bubbles = init.bubbles ?? true;
      this.cancelable = init.cancelable ?? true;
    }
    preventDefault() {}
  }

  const g = globalThis as typeof globalThis & {
    PointerEvent?: typeof MockPointerEvent;
    WheelEvent?: typeof MockWheelEvent;
  };
  const prevPointerEvent = g.PointerEvent;
  const prevWheelEvent = g.WheelEvent;
  g.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;
  g.WheelEvent = MockWheelEvent as unknown as typeof WheelEvent;

  const perfSpy = jest.spyOn(performance, "now").mockImplementation(() => perfNow);
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

  return {
    flushRaf(atMs: number) {
      perfNow = atMs;
      const batch = pendingRafs.splice(0, pendingRafs.length);
      for (const cb of batch) cb(atMs);
    },
    setPerfNow(ms: number) {
      perfNow = ms;
    },
    restore() {
      perfSpy.mockRestore();
      if (prevPointerEvent === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (g as { PointerEvent?: typeof MockPointerEvent }).PointerEvent;
      } else {
        g.PointerEvent = prevPointerEvent;
      }
      if (prevWheelEvent === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (g as { WheelEvent?: typeof MockWheelEvent }).WheelEvent;
      } else {
        g.WheelEvent = prevWheelEvent;
      }
      delete (globalThis as { requestAnimationFrame?: typeof requestAnimationFrame }).requestAnimationFrame;
      delete (globalThis as { cancelAnimationFrame?: typeof cancelAnimationFrame }).cancelAnimationFrame;
      delete (globalThis as unknown as { window?: Window }).window;
    },
  };
}

export function expectedInitTargetRangeM(
  surfaceOffsetM: number,
  radiusM: number = EARTH_RADIUS_M,
): number {
  return OrbitCam.clampOrbitCenterDistanceMeters({
    centerDistanceM: radiusM + surfaceOffsetM,
    sphereRadiusM: radiusM,
    minSurfaceClearanceM: GlobeConsts.MIN_SURFACE_CLEARANCE_M,
    maxOrbitCenterDistanceM: radiusM * 20,
  });
}

export function zoomIndicatorCenterFromPulse(
  pulseX: number,
  pulseY: number,
  indicatorSizePx = 18,
): { left: number; top: number } {
  return zoomIndicatorSquareTopLeftCss(pulseX, pulseY, indicatorSizePx);
}
