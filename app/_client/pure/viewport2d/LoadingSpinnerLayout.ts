/** Outer box size for a loading spinner ring with the given outer radius (CSS px). */
export function loadingSpinnerElementSizePx(radiusPx: number): number {
  return radiusPx * 2;
}

/** Top-left position so the spinner ring center sits at `(centerX, centerY)`. */
export function loadingSpinnerCenteredPositionPx(
  centerX: number,
  centerY: number,
  radiusPx: number,
): { left: number; top: number } {
  return {
    left: centerX - radiusPx,
    top: centerY - radiusPx,
  };
}
