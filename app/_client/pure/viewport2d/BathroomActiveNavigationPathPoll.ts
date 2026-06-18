import type { LatLong } from "@/app/_shared/BathroomDataPrimary";
import {
  hasReachedBathroomTarget,
  shouldRequestPathUpdate,
  type PathUpdateTracker,
} from "@/app/_shared/find-nearest-bathroom/PathUpdatePolicy";

export type PathPollTickInput = {
  readCurrentLocation: () => LatLong;
  tracker: PathUpdateTracker;
  target: LatLong;
  nowMs: number;
  debounceDurationMs: number;
  minDistanceM: number;
  arrivalDistanceM: number;
};

export type PathPollTickResult = {
  currentLocation: LatLong;
  reachedTarget: boolean;
  requestPathUpdate: boolean;
  pathUpdateTrigger: "distance_exceeded" | "failed_retry" | null;
};

/** One active-navigation poll tick: resolve live client position, then apply arrival + path-update policy. */
export function evaluatePathPollTick(input: PathPollTickInput): PathPollTickResult {
  const currentLocation = input.readCurrentLocation();

  const reachedTarget = hasReachedBathroomTarget(
    currentLocation,
    input.target,
    input.arrivalDistanceM,
  );

  const requestPathUpdate =
    !reachedTarget &&
    shouldRequestPathUpdate({
      tracker: input.tracker,
      currentLocation,
      nowMs: input.nowMs,
      debounceDurationMs: input.debounceDurationMs,
      minDistanceM: input.minDistanceM,
    });

  const pathUpdateTrigger = requestPathUpdate
    ? input.tracker.lastPathRequestFailed
      ? "failed_retry"
      : "distance_exceeded"
    : null;

  return { currentLocation, reachedTarget, requestPathUpdate, pathUpdateTrigger };
}
