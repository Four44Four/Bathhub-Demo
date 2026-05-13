export type ZoomIndicatorPhase = "in" | "out";

/** Top-left of a square centered at (centerX, centerY), in CSS pixels. */
export function zoomIndicatorSquareTopLeftCss(
  centerX: number,
  centerY: number,
  sizeCssPx: number,
): { left: number; top: number } {
  const half = sizeCssPx / 2;
  return { left: centerX - half, top: centerY - half };
}

export function zoomIndicatorOpacityTransitionCss(
  phase: ZoomIndicatorPhase,
  fadeInMs: number,
  fadeOutMs: number,
): string {
  return phase === "in"
    ? `opacity ${fadeInMs}ms ease-out`
    : `opacity ${fadeOutMs}ms linear`;
}
