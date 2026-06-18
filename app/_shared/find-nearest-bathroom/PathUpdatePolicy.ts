import { type LatLong } from "../BathroomDataPrimary";
import { sphericalPythagoreanDistanceMeters } from "./sphericalPythagoreanDistanceMeters";

export type PathUpdateTracker = {
  previousLocation: LatLong;
  previousTimestampMs: number;
  lastPathRequestFailed: boolean;
};

export function initialPathUpdateTracker(startLocation: LatLong): PathUpdateTracker {
  return {
    previousLocation: startLocation,
    previousTimestampMs: 0,
    lastPathRequestFailed: false,
  };
}

export function shouldRequestPathUpdate(args: {
  tracker: PathUpdateTracker;
  currentLocation: LatLong;
  nowMs: number;
  debounceDurationMs: number;
  minDistanceM: number;
}): boolean {
  const { tracker, currentLocation, nowMs, debounceDurationMs, minDistanceM } = args;
  if (tracker.previousTimestampMs === 0) {
    return true;
  }
  if (nowMs - tracker.previousTimestampMs < debounceDurationMs) {
    return false;
  }
  if (tracker.lastPathRequestFailed) {
    return true;
  }
  return (
    sphericalPythagoreanDistanceMeters(tracker.previousLocation, currentLocation) >
    minDistanceM
  );
}

export function isUsablePathPoints(
  points: readonly LatLong[] | null | undefined,
): points is LatLong[] {
  return !!points && points.length >= 2;
}

function pathUpdateTrackerAfterRequest(
  currentLocation: LatLong,
  requestStartedAtMs: number,
): PathUpdateTracker {
  return {
    previousLocation: currentLocation,
    previousTimestampMs: requestStartedAtMs,
    lastPathRequestFailed: false,
  };
}

export function pathUpdateTrackerAtRequestStart(
  tracker: PathUpdateTracker,
  requestStartedAtMs: number,
): PathUpdateTracker {
  return {
    ...tracker,
    previousTimestampMs: requestStartedAtMs,
    lastPathRequestFailed: false,
  };
}

export function pathUpdateTrackerAfterPathRequest(
  tracker: PathUpdateTracker,
  args: {
    startLocation: LatLong;
    requestStartedAtMs: number;
    points: readonly LatLong[] | null | undefined;
  },
): PathUpdateTracker {
  if (!isUsablePathPoints(args.points)) {
    return {
      ...tracker,
      lastPathRequestFailed: true,
    };
  }
  return pathUpdateTrackerAfterRequest(
    args.startLocation,
    args.requestStartedAtMs,
  );
}

export function hasReachedBathroomTarget(
  currentLocation: LatLong,
  targetLocation: LatLong,
  arrivalDistanceM: number,
): boolean {
  if (!Number.isFinite(arrivalDistanceM) || arrivalDistanceM <= 0) {
    return false;
  }
  return (
    sphericalPythagoreanDistanceMeters(currentLocation, targetLocation) <=
    arrivalDistanceM
  );
}
