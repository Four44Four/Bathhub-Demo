/** Billboard opacity after a viewport-center flash (1 at t=0, 0 at end of fade). */
export function debugCrosshairOpacityFromFadeProgress(fadeT01: number): number {
  return 1 - fadeT01;
}
