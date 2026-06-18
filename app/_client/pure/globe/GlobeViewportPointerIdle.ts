/** True when no pointers are down and the last pointer/wheel input was at least `idleThresholdMs` ago. */
export function isGlobeViewportPointerIdle(params: {
  pointersDownCount: number;
  msSinceLastPointerInput: number;
  idleThresholdMs: number;
}): boolean {
  const { pointersDownCount, msSinceLastPointerInput, idleThresholdMs } = params;
  return pointersDownCount === 0 && msSinceLastPointerInput >= idleThresholdMs;
}
