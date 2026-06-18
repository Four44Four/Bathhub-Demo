import {
  parsePersistedBathroomActiveNavigation,
  pathUpdateTrackerOriginLocation,
  persistLastPathPointsToStorage,
  readBathroomActiveNavigation,
  readInitialBathroomActiveNavigationFromWindow,
  serializePersistedBathroomActiveNavigation,
  writeBathroomActiveNavigation,
} from "../app/_shared/find-nearest-bathroom/BathroomActiveNavigationPersistence";
import {
  findNearestBathroomFailureAlertMessage,
  findNearestBathroomModeShouldRender,
  findNearestBathroomRequestApplyTerminalFailure,
  findNearestBathroomRequestBegin,
  findNearestBathroomRequestCanBegin,
  findNearestBathroomRequestReset,
  findNearestBathroomRequestResolveFailure,
  findNearestBathroomRequestResolveNotFound,
  findNearestBathroomRequestResolveSuccess,
  findNearestBathroomRequestResolveTimeout,
  INITIAL_FIND_NEAREST_BATHROOM_REQUEST_STATE,
  resolveFindNearestBathroomResult,
  viewport2dChromeHidden,
} from "../app/_client/pure/viewport2d/FindNearestBathroomState";
import {
  captureGlobeCameraStateAtInteraction,
  navigateGlobeToBathroomPreview,
  readSavedGlobeCameraState,
  restoreGlobeCameraState,
} from "../app/_client/pure/globe/GlobeCameraState";
import { resolveFindNearestBathroomFlowOutcome } from "../app/_client/pure/viewport2d/RunFindNearestBathroomFlow";

describe("BathroomActiveNavigationPersistence", () => {
  test("round-trips persisted navigation through memory storage", () => {
    const storage = new Map<string, string>();
    const mem = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };

    writeBathroomActiveNavigation(mem, {
      targetBathroomId: 42,
      targetLatitude: 1,
      targetLongitude: 2,
    });
    expect(readBathroomActiveNavigation(mem)).toEqual({
      targetBathroomId: 42,
      targetLatitude: 1,
      targetLongitude: 2,
    });
    writeBathroomActiveNavigation(mem, null);
    expect(readBathroomActiveNavigation(mem)).toBeNull();
  });

  test("persistLastPathPointsToStorage merges path points without replacing navigation", () => {
    const storage = new Map<string, string>();
    const mem = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };

    writeBathroomActiveNavigation(mem, {
      targetBathroomId: 7,
      targetLatitude: 10,
      targetLongitude: 20,
      findOriginLatitude: 1,
      findOriginLongitude: 2,
    });
    persistLastPathPointsToStorage(mem, [
      { latitude: 1.5, longitude: 2.5 },
      { latitude: 9, longitude: 19 },
    ]);
    expect(readBathroomActiveNavigation(mem)).toEqual({
      targetBathroomId: 7,
      targetLatitude: 10,
      targetLongitude: 20,
      findOriginLatitude: 1,
      findOriginLongitude: 2,
      lastPathPoints: [
        { latitude: 1.5, longitude: 2.5 },
        { latitude: 9, longitude: 19 },
      ],
    });
  });

  test("parsePersistedBathroomActiveNavigation rejects invalid JSON", () => {
    expect(parsePersistedBathroomActiveNavigation("not-json")).toBeNull();
    expect(
      parsePersistedBathroomActiveNavigation(
        serializePersistedBathroomActiveNavigation({
          targetBathroomId: 1,
          targetLatitude: 2,
          targetLongitude: 3,
        }),
      ),
    ).toEqual({
      targetBathroomId: 1,
      targetLatitude: 2,
      targetLongitude: 3,
    });
    expect(
      parsePersistedBathroomActiveNavigation(
        serializePersistedBathroomActiveNavigation({
          targetBathroomId: 1,
          targetLatitude: 2,
          targetLongitude: 3,
          findOriginLatitude: 4,
          findOriginLongitude: 5,
        }),
      ),
    ).toEqual({
      targetBathroomId: 1,
      targetLatitude: 2,
      targetLongitude: 3,
      findOriginLatitude: 4,
      findOriginLongitude: 5,
    });
    expect(
      parsePersistedBathroomActiveNavigation(
        serializePersistedBathroomActiveNavigation({
          targetBathroomId: 1,
          targetLatitude: 2,
          targetLongitude: 3,
          lastPathPoints: [{ latitude: 10, longitude: 20 }],
        }),
      ),
    ).toEqual({
      targetBathroomId: 1,
      targetLatitude: 2,
      targetLongitude: 3,
      lastPathPoints: [{ latitude: 10, longitude: 20 }],
    });
    expect(
      parsePersistedBathroomActiveNavigation(
        JSON.stringify({
          targetBathroomId: 1,
          targetLatitude: 2,
          targetLongitude: 3,
          lastPathPoints: [{ latitude: "bad", longitude: 20 }],
        }),
      ),
    ).toBeNull();
  });

  test("pathUpdateTrackerOriginLocation prefers persisted find origin", () => {
    expect(
      pathUpdateTrackerOriginLocation(
        {
          targetBathroomId: 1,
          targetLatitude: 2,
          targetLongitude: 3,
          findOriginLatitude: 10,
          findOriginLongitude: 20,
        },
        { latitude: 99, longitude: 88 },
      ),
    ).toEqual({ latitude: 10, longitude: 20 });
    expect(
      pathUpdateTrackerOriginLocation(
        {
          targetBathroomId: 1,
          targetLatitude: 2,
          targetLongitude: 3,
        },
        { latitude: 99, longitude: 88 },
      ),
    ).toEqual({ latitude: 99, longitude: 88 });
  });

  test("readInitialBathroomActiveNavigationFromWindow returns null without window", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    expect(readInitialBathroomActiveNavigationFromWindow()).toBeNull();
    globalThis.window = originalWindow;
  });

  test("readInitialBathroomActiveNavigationFromWindow restores persisted navigation", () => {
    const storage = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };
    writeBathroomActiveNavigation(localStorage, {
      targetBathroomId: 7,
      targetLatitude: -4.501,
      targetLongitude: -9.501,
    });

    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage },
    });
    expect(readInitialBathroomActiveNavigationFromWindow()).toEqual({
      targetBathroomId: 7,
      targetLatitude: -4.501,
      targetLongitude: -9.501,
    });
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "window", originalDescriptor);
    } else {
      // @ts-expect-error restore test env
      delete globalThis.window;
    }
  });
});

describe("FindNearestBathroomState", () => {
  test("request reducers transition only from valid phases", () => {
    expect(
      findNearestBathroomRequestBegin(INITIAL_FIND_NEAREST_BATHROOM_REQUEST_STATE),
    ).toEqual({ phase: "pending" });
    expect(
      findNearestBathroomRequestBegin({ phase: "pending" }),
    ).toEqual({ phase: "pending" });

    const pending = { phase: "pending" as const };
    expect(findNearestBathroomRequestResolveSuccess(pending)).toEqual({
      phase: "success",
    });
    expect(findNearestBathroomRequestResolveFailure(pending)).toEqual({
      phase: "failure",
    });
    expect(findNearestBathroomRequestResolveTimeout(pending)).toEqual({
      phase: "timeout",
    });
    expect(findNearestBathroomRequestResolveNotFound(pending)).toEqual({
      phase: "not_found",
    });
    expect(findNearestBathroomRequestResolveSuccess({ phase: "idle" })).toEqual({
      phase: "idle",
    });
    expect(findNearestBathroomRequestReset()).toEqual(
      INITIAL_FIND_NEAREST_BATHROOM_REQUEST_STATE,
    );
  });

  test("resolveFindNearestBathroomFlowOutcome maps server responses to flow outcomes", () => {
    expect(
      resolveFindNearestBathroomFlowOutcome({
        val: { id: 3, latitude: 1, longitude: 2 },
      }),
    ).toEqual({
      kind: "enter_preview",
      target: { id: 3, latitude: 1, longitude: 2 },
    });
    expect(resolveFindNearestBathroomFlowOutcome("timeout")).toEqual({
      kind: "terminal_failure",
      phase: "timeout",
    });
    expect(resolveFindNearestBathroomFlowOutcome({ val: null })).toEqual({
      kind: "terminal_failure",
      phase: "not_found",
    });
    expect(
      resolveFindNearestBathroomFlowOutcome({
        val: null,
        errorMsg: "db error",
      }),
    ).toEqual({
      kind: "terminal_failure",
      phase: "failure",
    });
  });

  test("findNearestBathroomRequestApplyTerminalFailure maps terminal phases", () => {
    const pending = { phase: "pending" as const };
    expect(
      findNearestBathroomRequestApplyTerminalFailure(pending, "timeout"),
    ).toEqual({ phase: "timeout" });
    expect(
      findNearestBathroomRequestApplyTerminalFailure(pending, "not_found"),
    ).toEqual({ phase: "not_found" });
    expect(
      findNearestBathroomRequestApplyTerminalFailure(pending, "failure"),
    ).toEqual({ phase: "failure" });
  });

  test("resolveFindNearestBathroomResult maps outcomes", () => {
    expect(resolveFindNearestBathroomResult("timeout")).toBe("timeout");
    expect(resolveFindNearestBathroomResult("error")).toBe("failure");
    expect(resolveFindNearestBathroomResult({ val: null, errorMsg: "x" })).toBe(
      "failure",
    );
    expect(resolveFindNearestBathroomResult({ val: null })).toBe("not_found");
    expect(
      resolveFindNearestBathroomResult({
        val: { id: 1, latitude: 0, longitude: 0 },
      }),
    ).toBe("success");
  });

  test("findNearestBathroomModeShouldRender follows preview flag", () => {
    expect(findNearestBathroomModeShouldRender(false)).toBe(false);
    expect(findNearestBathroomModeShouldRender(true)).toBe(true);
  });

  test("viewport2dChromeHidden hides chrome for add-bathroom and confirm preview only", () => {
    expect(
      viewport2dChromeHidden({
        addBathroomModeActive: false,
        bathroomNavigationPreviewActive: false,
      }),
    ).toBe(false);
    expect(
      viewport2dChromeHidden({
        addBathroomModeActive: true,
        bathroomNavigationPreviewActive: false,
      }),
    ).toBe(true);
    expect(
      viewport2dChromeHidden({
        addBathroomModeActive: false,
        bathroomNavigationPreviewActive: true,
      }),
    ).toBe(true);
  });

  test("findNearestBathroomRequestCanBegin blocks during preview and active navigation", () => {
    expect(findNearestBathroomRequestCanBegin(false, false)).toBe(true);
    expect(findNearestBathroomRequestCanBegin(true, false)).toBe(false);
    expect(findNearestBathroomRequestCanBegin(false, true)).toBe(false);
    expect(findNearestBathroomRequestCanBegin(true, true)).toBe(false);
  });

  test("findNearestBathroomFailureAlertMessage returns spec strings", () => {
    expect(findNearestBathroomFailureAlertMessage("timeout")).toBe(
      "Finding bathroom timed out",
    );
    expect(findNearestBathroomFailureAlertMessage("failure")).toBe(
      "An error occurred while finding nearest bathroom",
    );
    expect(findNearestBathroomFailureAlertMessage("not_found")).toBe(
      "No valid nearby bathrooms were found",
    );
  });
});

describe("GlobeCameraState", () => {
  test("captureGlobeCameraStateAtInteraction resyncs viewport before reading", () => {
    const calls: string[] = [];
    const globe = {
      requestViewportResync: () => calls.push("resync"),
      getViewportCenterLatLon: () => ({ latitude: 10, longitude: 20 }),
      getOrbitCenterDistanceM: () => 6_371_000 + 1200,
    };

    expect(
      captureGlobeCameraStateAtInteraction(globe, { latitude: 0, longitude: 0 }),
    ).toEqual({
      centerLatitude: 10,
      centerLongitude: 20,
      orbitCenterDistanceM: 6_371_000 + 1200,
    });
    expect(calls).toEqual(["resync"]);
  });

  test("readSavedGlobeCameraState falls back when globe is null", () => {
    expect(
      readSavedGlobeCameraState(null, { latitude: 3, longitude: 4 }),
    ).toEqual({
      centerLatitude: 3,
      centerLongitude: 4,
      orbitCenterDistanceM: Number.POSITIVE_INFINITY,
    });
  });

  test("restoreGlobeCameraState snaps when smooth animations are off", () => {
    const calls: string[] = [];
    const globe = {
      animateTo: () => calls.push("animateTo"),
      animateZoomToOrbitCenterDistanceM: () => calls.push("animateZoom"),
      beginGeoArrivalInteractionLock: () => calls.push("lock"),
      snapTo: () => calls.push("snapTo"),
      snapZoomToOrbitCenterDistanceM: () => calls.push("snapZoom"),
    };

    restoreGlobeCameraState(
      globe,
      { centerLatitude: 1, centerLongitude: 2, orbitCenterDistanceM: 6_371_500 },
      false,
      1500,
    );
    expect(calls).toEqual(["snapTo", "snapZoom"]);
  });

  test("navigateGlobeToBathroomPreview animates when smooth animations are on", () => {
    const calls: string[] = [];
    let idleListener: (() => void) | null = null;
    const globe = {
      animateTo: () => calls.push("animateTo"),
      animateZoomToInitTarget: () => calls.push("animateZoomToInit"),
      beginGeoArrivalInteractionLock: () => calls.push("lock"),
      snapTo: () => calls.push("snapTo"),
      snapZoomToInitTarget: () => calls.push("snapZoomToInit"),
      requestViewportResync: () => calls.push("resync"),
      subscribeCameraMotionIdle: (listener: () => void) => {
        idleListener = listener;
        return () => {
          idleListener = null;
        };
      },
      isGlobeViewportSamplerBusy: () => true,
    };

    navigateGlobeToBathroomPreview(globe, 10, 20, true, 1500);
    expect(calls).toEqual(["lock", "animateTo", "animateZoomToInit"]);
    expect(idleListener).not.toBeNull();
    idleListener!();
    expect(calls).toEqual([
      "lock",
      "animateTo",
      "animateZoomToInit",
      "resync",
    ]);
  });

  test("navigateGlobeToBathroomPreview snaps when smooth animations are off", () => {
    const calls: string[] = [];
    const globe = {
      animateTo: () => calls.push("animateTo"),
      animateZoomToInitTarget: () => calls.push("animateZoomToInit"),
      beginGeoArrivalInteractionLock: () => calls.push("lock"),
      snapTo: () => calls.push("snapTo"),
      snapZoomToInitTarget: () => calls.push("snapZoomToInit"),
      requestViewportResync: () => calls.push("resync"),
      subscribeCameraMotionIdle: () => () => {},
      isGlobeViewportSamplerBusy: () => false,
    };

    navigateGlobeToBathroomPreview(globe, 10, 20, false, 1500);
    expect(calls).toEqual(["snapTo", "snapZoomToInit", "resync"]);
  });
});
