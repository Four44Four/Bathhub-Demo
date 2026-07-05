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

/**
 * Appends a band alert and drops the oldest entries when the stack exceeds {@link maxStack}.
 * Tie-breaking on equal {@link createdAtMs} favors keeping later entries in `alerts`.
 */
export function appendBandAlertWithMaxStack<
  T extends { id: string; createdAtMs: number },
>(alerts: readonly T[], newAlert: T, maxStack: number): T[] {
  const next = [...alerts, newAlert];
  if (maxStack <= 0) {
    return [];
  }
  if (next.length <= maxStack) {
    return next;
  }

  const excess = next.length - maxStack;
  const indexed = next.map((alert, index) => ({ alert, index }));
  indexed.sort((a, b) => {
    const timeDiff = a.alert.createdAtMs - b.alert.createdAtMs;
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return a.index - b.index;
  });

  const oldestIds = new Set(
    indexed.slice(0, excess).map(({ alert }) => alert.id),
  );
  return next.filter((alert) => !oldestIds.has(alert.id));
}
