export type LocalViewportSyncSchedulePlan =
  | { kind: "skip"; reason: "timer_pending" }
  | { kind: "arm"; delayMs: number };

/**
 * Plans the next local viewport sync timer. Unlike debounce, a timer that is
 * already pending is not reset by further viewport changes — sync fires on a
 * fixed minimum delay while the user keeps panning or zooming.
 */
export function planLocalViewportSyncSchedule(
  timerAlreadyScheduled: boolean,
  delayMs: number,
): LocalViewportSyncSchedulePlan {
  if (timerAlreadyScheduled) {
    return { kind: "skip", reason: "timer_pending" };
  }
  return { kind: "arm", delayMs };
}
