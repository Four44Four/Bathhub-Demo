import { sphericalPythagoreanDistanceMeters } from "@/app/_shared/find-nearest-bathroom/sphericalPythagoreanDistanceMeters";

export type GeoLatLon = {
  latitude: number;
  longitude: number;
};

export type UserGeolocationCalculatorState = {
  userGeoPosition: GeoLatLon | null;
  maybeUserGeoPosition: GeoLatLon | null;
  maybeUserGeoPositionAccuracyMeters: number | null;
};

export function createInitialUserGeolocationCalculatorState(): UserGeolocationCalculatorState {
  return {
    userGeoPosition: null,
    maybeUserGeoPosition: null,
    maybeUserGeoPositionAccuracyMeters: null,
  };
}

/** Whether `point` lies inside the accuracy circle centered at `center`. */
export function geoPositionWithinAccuracyRadius(
  center: GeoLatLon,
  radiusMeters: number,
  point: GeoLatLon,
  distanceMeters: (a: GeoLatLon, b: GeoLatLon) => number = sphericalPythagoreanDistanceMeters,
): boolean {
  if (!Number.isFinite(radiusMeters) || radiusMeters < 0) return false;
  return distanceMeters(center, point) <= radiusMeters;
}

/** Spec: first fix on load or after permission grant sets both confirmed and tentative positions. */
export function applyInitialGeolocationFixToCalculatorState(
  state: UserGeolocationCalculatorState,
  polled: GeoLatLon,
  accuracyMeters: number,
): UserGeolocationCalculatorState {
  return {
    userGeoPosition: polled,
    maybeUserGeoPosition: polled,
    maybeUserGeoPositionAccuracyMeters: accuracyMeters,
  };
}

/** Spec: periodic poll updates tentative position and conditionally confirms user position. */
export function applyPeriodicGeolocationPollToCalculatorState(
  state: UserGeolocationCalculatorState,
  polled: GeoLatLon,
  accuracyMeters: number,
  distanceMeters: (a: GeoLatLon, b: GeoLatLon) => number = sphericalPythagoreanDistanceMeters,
): UserGeolocationCalculatorState {
  const maybeUserGeoPosition = polled;
  const maybeUserGeoPositionAccuracyMeters = accuracyMeters;

  const currentUser = state.userGeoPosition;
  const userGeoPosition =
    currentUser &&
    geoPositionWithinAccuracyRadius(
      maybeUserGeoPosition,
      maybeUserGeoPositionAccuracyMeters,
      currentUser,
      distanceMeters,
    )
      ? currentUser
      : polled;

  return {
    userGeoPosition,
    maybeUserGeoPosition,
    maybeUserGeoPositionAccuracyMeters,
  };
}

/** Seeds confirmed and tentative positions (e.g. session cache bootstrap). */
export function seedUserGeolocationCalculatorState(
  state: UserGeolocationCalculatorState,
  position: GeoLatLon,
  accuracyMeters = 0,
): UserGeolocationCalculatorState {
  return applyInitialGeolocationFixToCalculatorState(state, position, accuracyMeters);
}
