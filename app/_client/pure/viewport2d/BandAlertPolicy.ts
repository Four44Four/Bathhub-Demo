/** Milliseconds until auto-hide, or null when the band stays until manually removed. */
export function resolveBandAlertAutoHideDelayMs(
  persistUntilRemoved: boolean,
  autoHideMs: number,
): number | null {
  return persistUntilRemoved ? null : autoHideMs;
}

/** Newest band alerts first for vertical stacking at the top of the viewport. */
export function orderBandAlertsNewestFirst<T extends { createdAtMs: number }>(
  alerts: readonly T[],
): T[] {
  return [...alerts].sort((a, b) => b.createdAtMs - a.createdAtMs);
}
