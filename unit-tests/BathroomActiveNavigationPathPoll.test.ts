import { readClientStartPos } from "../app/_client/pure/globe/ClientGeoStartPos";
import { evaluatePathPollTick } from "../app/_client/pure/viewport2d/BathroomActiveNavigationPathPoll";
import {
  initialPathUpdateTracker,
  pathUpdateTrackerAfterPathRequest,
  pathUpdateTrackerAtRequestStart,
} from "../app/_shared/find-nearest-bathroom/PathUpdatePolicy";

const DEBOUNCE_MS = 3_000;
const MIN_DISTANCE_M = 25;
const ARRIVAL_DISTANCE_M = 30;

describe("BathroomActiveNavigationPathPoll", () => {
  test("reads a fresh client location each tick so movement after first fix can trigger path update", () => {
    const clientGeo = {
      isClientGeoGranted: true,
      mapInitLat: 0,
      mapInitLong: 0,
    };

    const readCurrentLocation = () => readClientStartPos(null, clientGeo);
    const target = { latitude: 1, longitude: 0 };

    let tracker = initialPathUpdateTracker(readCurrentLocation());
    tracker = pathUpdateTrackerAfterPathRequest(
      pathUpdateTrackerAtRequestStart(tracker, 1_000),
      {
        startLocation: { latitude: 0, longitude: 0 },
        requestStartedAtMs: 1_000,
        points: [
          { latitude: 0, longitude: 0 },
          { latitude: 0.001, longitude: 0 },
        ],
      },
    );

    const beforeMove = evaluatePathPollTick({
      readCurrentLocation,
      tracker,
      target,
      nowMs: 2_000,
      debounceDurationMs: DEBOUNCE_MS,
      minDistanceM: MIN_DISTANCE_M,
      arrivalDistanceM: ARRIVAL_DISTANCE_M,
    });
    expect(beforeMove.requestPathUpdate).toBe(false);
    expect(beforeMove.pathUpdateTrigger).toBeNull();
    expect(beforeMove.currentLocation).toEqual({ latitude: 0, longitude: 0 });

    clientGeo.mapInitLat = 0.001;

    const afterMove = evaluatePathPollTick({
      readCurrentLocation,
      tracker,
      target,
      nowMs: 5_000,
      debounceDurationMs: DEBOUNCE_MS,
      minDistanceM: MIN_DISTANCE_M,
      arrivalDistanceM: ARRIVAL_DISTANCE_M,
    });
    expect(afterMove.currentLocation).toEqual({ latitude: 0.001, longitude: 0 });
    expect(afterMove.requestPathUpdate).toBe(true);
    expect(afterMove.pathUpdateTrigger).toBe("distance_exceeded");
  });

  test("does not request path update when readCurrentLocation returns a frozen position", () => {
    const frozenLocation = { latitude: 0, longitude: 0 };
    const target = { latitude: 1, longitude: 0 };

    let tracker = initialPathUpdateTracker(frozenLocation);
    tracker = pathUpdateTrackerAfterPathRequest(
      pathUpdateTrackerAtRequestStart(tracker, 1_000),
      {
        startLocation: frozenLocation,
        requestStartedAtMs: 1_000,
        points: [
          frozenLocation,
          { latitude: 0.001, longitude: 0 },
        ],
      },
    );

    const tick = evaluatePathPollTick({
      readCurrentLocation: () => frozenLocation,
      tracker,
      target,
      nowMs: 5_000,
      debounceDurationMs: DEBOUNCE_MS,
      minDistanceM: MIN_DISTANCE_M,
      arrivalDistanceM: ARRIVAL_DISTANCE_M,
    });

    expect(tick.requestPathUpdate).toBe(false);
    expect(tick.pathUpdateTrigger).toBeNull();
  });

  test("reports failed_retry when debounce elapsed after a failed path response", () => {
    const frozenLocation = { latitude: 0, longitude: 0 };
    const target = { latitude: 1, longitude: 0 };

    let tracker = initialPathUpdateTracker(frozenLocation);
    tracker = pathUpdateTrackerAtRequestStart(tracker, 1_000);
    tracker = pathUpdateTrackerAfterPathRequest(tracker, {
      startLocation: frozenLocation,
      requestStartedAtMs: 1_000,
      points: null,
    });

    const tick = evaluatePathPollTick({
      readCurrentLocation: () => frozenLocation,
      tracker,
      target,
      nowMs: 5_000,
      debounceDurationMs: DEBOUNCE_MS,
      minDistanceM: MIN_DISTANCE_M,
      arrivalDistanceM: ARRIVAL_DISTANCE_M,
    });

    expect(tick.requestPathUpdate).toBe(true);
    expect(tick.pathUpdateTrigger).toBe("failed_retry");
  });
});
