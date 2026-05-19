/**
 * Blocks user-driven orbit zoom/rotate for a fixed wall-clock interval after
 * `beginGeoArrivalLock` (callers should pass the same duration as post-geolocation
 * init animations, e.g. `Globe.ANIMATE_ON_INIT_DURA` from `ComponentConstants`).
 *
 * Lock applies as soon as `beginGeoArrivalLock` runs; release when
 * `nowMs - lockedAtMs >= lockDurationMs` (no camera-busy heuristics).
 */

export type GeoArrivalLockState =
  | { kind: "idle" }
  | { kind: "locked"; lockedAtMs: number; lockDurationMs: number };

export function initialGeoArrivalLockState(): GeoArrivalLockState {
  return { kind: "idle" };
}

/**
 * @param lockDurationMs Must match the geolocation init animation duration (e.g. `Globe.ANIMATE_ON_INIT_DURA`).
 */
export function beginGeoArrivalLock(
  _state: GeoArrivalLockState,
  nowMs: number,
  lockDurationMs: number,
): GeoArrivalLockState {
  return {
    kind: "locked",
    lockedAtMs: nowMs,
    lockDurationMs: Math.max(0, lockDurationMs),
  };
}

export function reduceGeoArrivalLockForTick(state: GeoArrivalLockState, nowMs: number): GeoArrivalLockState {
  if (state.kind === "idle") return state;
  const elapsed = nowMs - state.lockedAtMs;
  if (elapsed >= state.lockDurationMs) {
    return { kind: "idle" };
  }
  return state;
}

export function isGlobeOrbitUserInputAllowed(state: GeoArrivalLockState): boolean {
  return state.kind === "idle";
}
