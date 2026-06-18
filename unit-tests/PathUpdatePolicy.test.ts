import { sphericalPythagoreanDistanceMeters } from "../app/_shared/find-nearest-bathroom/sphericalPythagoreanDistanceMeters";
import {
  hasReachedBathroomTarget,
  initialPathUpdateTracker,
  isUsablePathPoints,
  pathUpdateTrackerAfterPathRequest,
  pathUpdateTrackerAtRequestStart,
  shouldRequestPathUpdate,
} from "../app/_shared/find-nearest-bathroom/PathUpdatePolicy";

const WGS84_MEAN_EARTH_RADIUS_M = 6_371_000;

/** One degree of longitude at the equator on the WGS84 mean sphere (meters). */
const ONE_DEG_LON_AT_EQUATOR_M =
  (Math.PI / 180) * WGS84_MEAN_EARTH_RADIUS_M;

describe("sphericalPythagoreanDistanceMeters", () => {
  test("returns zero for identical points", () => {
    expect(
      sphericalPythagoreanDistanceMeters(
        { latitude: 10, longitude: 20 },
        { latitude: 10, longitude: 20 },
      ),
    ).toBe(0);
  });

  test("returns positive distance for separated points", () => {
    const d = sphericalPythagoreanDistanceMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    );
    expect(d).toBeGreaterThan(0);
  });

  test("matches equirectangular approximation at the equator", () => {
    const d = sphericalPythagoreanDistanceMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    );
    expect(d).toBeCloseTo(ONE_DEG_LON_AT_EQUATOR_M, 0);
  });

  // Equirectangular approximation: longitude delta is scaled by cos(avgLat) and
  // is not normalized across the antimeridian; accuracy degrades near the poles.
  test("does not normalize longitude across the antimeridian", () => {
    const d = sphericalPythagoreanDistanceMeters(
      { latitude: 0, longitude: 179 },
      { latitude: 0, longitude: -179 },
    );
    const shortestArcM = 2 * ONE_DEG_LON_AT_EQUATOR_M;
    expect(d).toBeGreaterThan(shortestArcM * 100);
  });
});

describe("PathUpdatePolicy", () => {
  test("shouldRequestPathUpdate allows first request immediately", () => {
    const tracker = initialPathUpdateTracker({ latitude: 0, longitude: 0 });
    expect(
      shouldRequestPathUpdate({
        tracker,
        currentLocation: { latitude: 0.001, longitude: 0 },
        nowMs: 1000,
        debounceDurationMs: 3000,
        minDistanceM: 25,
      }),
    ).toBe(true);
  });

  test("shouldRequestPathUpdate respects debounce and distance", () => {
    let tracker = initialPathUpdateTracker({ latitude: 0, longitude: 0 });
    tracker = pathUpdateTrackerAfterPathRequest(tracker, {
      startLocation: { latitude: 0, longitude: 0 },
      requestStartedAtMs: 1000,
      points: [
        { latitude: 0, longitude: 0 },
        { latitude: 0.001, longitude: 0 },
      ],
    });

    expect(
      shouldRequestPathUpdate({
        tracker,
        currentLocation: { latitude: 0.0001, longitude: 0 },
        nowMs: 2000,
        debounceDurationMs: 3000,
        minDistanceM: 25,
      }),
    ).toBe(false);

    expect(
      shouldRequestPathUpdate({
        tracker,
        currentLocation: { latitude: 0.001, longitude: 0 },
        nowMs: 5000,
        debounceDurationMs: 3000,
        minDistanceM: 25,
      }),
    ).toBe(true);
  });

  test("isUsablePathPoints requires at least two points", () => {
    expect(isUsablePathPoints(null)).toBe(false);
    expect(isUsablePathPoints([])).toBe(false);
    expect(isUsablePathPoints([{ latitude: 0, longitude: 0 }])).toBe(false);
    expect(
      isUsablePathPoints([
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 1 },
      ]),
    ).toBe(true);
  });

  test("pathUpdateTrackerAfterPathRequest uses request start time and only advances location on success", () => {
    const tracker = initialPathUpdateTracker({ latitude: 0, longitude: 0 });
    const startLocation = { latitude: 0.001, longitude: 0 };
    const requestStartedAtMs = 1000;
    const responseReceivedAtMs = 9000;
    const started = pathUpdateTrackerAtRequestStart(tracker, requestStartedAtMs);

    expect(
      pathUpdateTrackerAfterPathRequest(started, {
        startLocation,
        requestStartedAtMs,
        points: null,
      }),
    ).toEqual({
      previousLocation: { latitude: 0, longitude: 0 },
      previousTimestampMs: requestStartedAtMs,
      lastPathRequestFailed: true,
    });

    const advanced = pathUpdateTrackerAfterPathRequest(started, {
      startLocation,
      requestStartedAtMs,
      points: [
        { latitude: 0, longitude: 0 },
        { latitude: 0.001, longitude: 0 },
      ],
    });
    expect(advanced).toEqual({
      previousLocation: startLocation,
      previousTimestampMs: requestStartedAtMs,
      lastPathRequestFailed: false,
    });
    expect(advanced.previousTimestampMs).not.toBe(responseReceivedAtMs);
  });

  test("shouldRequestPathUpdate retries failed path responses after debounce without movement", () => {
    let tracker = initialPathUpdateTracker({ latitude: 0, longitude: 0 });
    tracker = pathUpdateTrackerAtRequestStart(tracker, 1000);
    tracker = pathUpdateTrackerAfterPathRequest(tracker, {
      startLocation: { latitude: 0, longitude: 0 },
      requestStartedAtMs: 1000,
      points: null,
    });

    expect(
      shouldRequestPathUpdate({
        tracker,
        currentLocation: { latitude: 0, longitude: 0 },
        nowMs: 2000,
        debounceDurationMs: 3000,
        minDistanceM: 25,
      }),
    ).toBe(false);

    expect(
      shouldRequestPathUpdate({
        tracker,
        currentLocation: { latitude: 0, longitude: 0 },
        nowMs: 5000,
        debounceDurationMs: 3000,
        minDistanceM: 25,
      }),
    ).toBe(true);
  });

  test("hasReachedBathroomTarget uses arrival threshold", () => {
    expect(
      hasReachedBathroomTarget(
        { latitude: 10, longitude: 10 },
        { latitude: 10, longitude: 10 },
        30,
      ),
    ).toBe(true);
  });

  test("hasReachedBathroomTarget returns false when outside arrival threshold", () => {
    expect(
      hasReachedBathroomTarget(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
        30,
      ),
    ).toBe(false);
  });

  test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "hasReachedBathroomTarget returns false for invalid arrivalDistanceM (%p)",
    (arrivalDistanceM) => {
      expect(
        hasReachedBathroomTarget(
          { latitude: 10, longitude: 10 },
          { latitude: 10, longitude: 10 },
          arrivalDistanceM,
        ),
      ).toBe(false);
    },
  );

  test("arrival detection is independent of path-update debounce", () => {
    const target = { latitude: 40.7128, longitude: -74.006 };
    const arrivedPos = { latitude: 40.71281, longitude: -74.00601 };
    const tracker = pathUpdateTrackerAfterPathRequest(
      initialPathUpdateTracker(arrivedPos),
      {
        startLocation: arrivedPos,
        requestStartedAtMs: 5000,
        points: [arrivedPos, target],
      },
    );

    expect(hasReachedBathroomTarget(arrivedPos, target, 30)).toBe(true);
    expect(
      shouldRequestPathUpdate({
        tracker,
        currentLocation: arrivedPos,
        nowMs: 6000,
        debounceDurationMs: 3000,
        minDistanceM: 25,
      }),
    ).toBe(false);
  });
});
