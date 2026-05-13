/**
 * Linear progress 0→1 over `durationMs`, or 1 immediately if duration is non-positive.
 */
export function linearProgress01(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  return Math.min(1, elapsedMs / durationMs);
}

/** Billboard opacity after a viewport-center flash (1 at t=0, 0 at end of fade). */
export function debugCrosshairOpacityFromFadeProgress(fadeT01: number): number {
  return 1 - fadeT01;
}
