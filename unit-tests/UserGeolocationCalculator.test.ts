import {
  applyInitialGeolocationFixToCalculatorState,
  applyPeriodicGeolocationPollToCalculatorState,
  createInitialUserGeolocationCalculatorState,
  geoPositionWithinAccuracyRadius,
  seedUserGeolocationCalculatorState,
} from "../app/_client/pure/globe/UserGeolocationCalculator";

describe("UserGeolocationCalculator", () => {
  const distanceMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const dLat = Math.abs(a.latitude - b.latitude);
    const dLon = Math.abs(a.longitude - b.longitude);
    return Math.hypot(dLat, dLon) * 111_000;
  };

  test("initial fix sets confirmed and tentative positions", () => {
    const state = applyInitialGeolocationFixToCalculatorState(
      createInitialUserGeolocationCalculatorState(),
      { latitude: 10, longitude: 20 },
      25,
    );
    expect(state.userGeoPosition).toEqual({ latitude: 10, longitude: 20 });
    expect(state.maybeUserGeoPosition).toEqual({ latitude: 10, longitude: 20 });
    expect(state.maybeUserGeoPositionAccuracyMeters).toBe(25);
  });

  test("periodic poll keeps user position when within accuracy radius", () => {
    const initial = applyInitialGeolocationFixToCalculatorState(
      createInitialUserGeolocationCalculatorState(),
      { latitude: 10, longitude: 20 },
      50,
    );
    const next = applyPeriodicGeolocationPollToCalculatorState(
      initial,
      { latitude: 10.0001, longitude: 20.0001 },
      100,
      distanceMeters,
    );
    expect(next.userGeoPosition).toEqual({ latitude: 10, longitude: 20 });
    expect(next.maybeUserGeoPosition).toEqual({ latitude: 10.0001, longitude: 20.0001 });
  });

  test("periodic poll updates user position when outside accuracy radius", () => {
    const initial = applyInitialGeolocationFixToCalculatorState(
      createInitialUserGeolocationCalculatorState(),
      { latitude: 10, longitude: 20 },
      10,
    );
    const next = applyPeriodicGeolocationPollToCalculatorState(
      initial,
      { latitude: 10.01, longitude: 20.01 },
      10,
      distanceMeters,
    );
    expect(next.userGeoPosition).toEqual({ latitude: 10.01, longitude: 20.01 });
  });

  test("seed positions match initial fix behavior", () => {
    const state = seedUserGeolocationCalculatorState(
      createInitialUserGeolocationCalculatorState(),
      { latitude: 1, longitude: 2 },
      5,
    );
    expect(state.userGeoPosition).toEqual({ latitude: 1, longitude: 2 });
    expect(state.maybeUserGeoPositionAccuracyMeters).toBe(5);
  });

  test("geoPositionWithinAccuracyRadius respects radius", () => {
    const center = { latitude: 0, longitude: 0 };
    const inside = { latitude: 0.0001, longitude: 0 };
    const outside = { latitude: 1, longitude: 0 };
    expect(geoPositionWithinAccuracyRadius(center, 50, inside, distanceMeters)).toBe(true);
    expect(geoPositionWithinAccuracyRadius(center, 50, outside, distanceMeters)).toBe(false);
  });

  test("periodic poll adopts polled position when no confirmed position exists", () => {
    const state = createInitialUserGeolocationCalculatorState();
    const next = applyPeriodicGeolocationPollToCalculatorState(
      state,
      { latitude: 10, longitude: 20 },
      25,
      distanceMeters,
    );
    expect(next.userGeoPosition).toEqual({ latitude: 10, longitude: 20 });
    expect(next.maybeUserGeoPosition).toEqual({ latitude: 10, longitude: 20 });
    expect(next.maybeUserGeoPositionAccuracyMeters).toBe(25);
  });

  test("geoPositionWithinAccuracyRadius returns false for invalid radius", () => {
    const center = { latitude: 0, longitude: 0 };
    const point = { latitude: 0, longitude: 0 };
    expect(geoPositionWithinAccuracyRadius(center, -1, point, distanceMeters)).toBe(false);
    expect(geoPositionWithinAccuracyRadius(center, NaN, point, distanceMeters)).toBe(false);
    expect(geoPositionWithinAccuracyRadius(center, Infinity, point, distanceMeters)).toBe(false);
  });
});
