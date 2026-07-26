import { type Rect } from "../Utils";

export type CornerRadiiPx = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

export type PhoneViewportCorner = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";

const DEFAULT_EDGE_EPSILON_PX = 0.5;

function edgesTouch(a: number, b: number, epsilonPx: number): boolean {
  return Math.abs(a - b) <= epsilonPx;
}

/**
 * Radius applies only to corners where `element` actually coincides with `frame`.
 * Used when a child (e.g. the globe) is inset by a danger band and must not round
 * mid-air top corners.
 */
export function phoneFrameCornerRadii(
  frame: Rect,
  element: Rect,
  radiusPx: number,
  epsilonPx: number = DEFAULT_EDGE_EPSILON_PX,
): CornerRadiiPx {
  const frameRight = frame.left + frame.width;
  const frameBottom = frame.top + frame.height;
  const elementRight = element.left + element.width;
  const elementBottom = element.top + element.height;

  const touchesLeft = edgesTouch(element.left, frame.left, epsilonPx);
  const touchesRight = edgesTouch(elementRight, frameRight, epsilonPx);
  const touchesTop = edgesTouch(element.top, frame.top, epsilonPx);
  const touchesBottom = edgesTouch(elementBottom, frameBottom, epsilonPx);

  return {
    topLeft: touchesTop && touchesLeft ? radiusPx : 0,
    topRight: touchesTop && touchesRight ? radiusPx : 0,
    bottomRight: touchesBottom && touchesRight ? radiusPx : 0,
    bottomLeft: touchesBottom && touchesLeft ? radiusPx : 0,
  };
}

/** e.g. `"inset(0 round 14px 14px 0 0)"` */
export function roundedInsetClipPath(radii: CornerRadiiPx): string {
  return `inset(0 round ${radii.topLeft}px ${radii.topRight}px ${radii.bottomRight}px ${radii.bottomLeft}px)`;
}

/** CSS `border-radius` shorthand matching {@link CornerRadiiPx} order. */
export function cornerRadiiBorderRadiusCss(radii: CornerRadiiPx): string {
  return `${radii.topLeft}px ${radii.topRight}px ${radii.bottomRight}px ${radii.bottomLeft}px`;
}

/** Full-frame rounded clip when an overlay covers the entire phone viewport. */
export function phoneViewportFullRoundedClipPath(radiusPx: number): string {
  return roundedInsetClipPath({
    topLeft: radiusPx,
    topRight: radiusPx,
    bottomRight: radiusPx,
    bottomLeft: radiusPx,
  });
}

/**
 * SVG path (local 0..radiusPx box) for the rectangular corner wedge outside the
 * phone's rounded arc. Used to paint over WebGL pixels Firefox fails to clip.
 *
 * Prefer {@link phoneViewportCornerCoverDraw} for rendering so top-right is a
 * true horizontal mirror of the proven top-left path.
 */
export function phoneViewportCornerCoverPath(
  corner: PhoneViewportCorner,
  radiusPx: number,
): string {
  const r = radiusPx;
  switch (corner) {
    case "topLeft":
      // Arc center (r,r). Sweep 0 follows the phone edge; fill is the outside wedge.
      return `M0 0 H${r} A${r} ${r} 0 0 0 0 ${r} Z`;
    case "topRight":
      // Horizontal mirror of topLeft: x' = r - x, SVG sweep flag inverted.
      return `M${r} 0 H0 A${r} ${r} 0 0 1 ${r} ${r} Z`;
    case "bottomRight":
      // Arc center (0,0). In SVG (Y-down), sweep 1 follows the phone edge.
      return `M${r} ${r} V0 A${r} ${r} 0 0 1 0 ${r} Z`;
    case "bottomLeft":
      // Arc center (r,0). Sweep 1 follows the phone edge; fill toward (0,r).
      return `M0 ${r} H${r} A${r} ${r} 0 0 1 0 0 Z`;
  }
}

export type CornerCoverDraw = {
  path: string;
  /** SVG transform on the path; used to mirror top-left into top-right. */
  transform?: string;
};

/**
 * Drawing instructions for a corner cover. Top-right reuses the top-left path
 * with `translate(r,0) scale(-1,1)` so the fill matches a true horizontal mirror.
 */
export function phoneViewportCornerCoverDraw(
  corner: PhoneViewportCorner,
  radiusPx: number,
): CornerCoverDraw {
  if (corner === "topRight") {
    return {
      path: phoneViewportCornerCoverPath("topLeft", radiusPx),
      transform: `translate(${radiusPx} 0) scale(-1 1)`,
    };
  }
  return { path: phoneViewportCornerCoverPath(corner, radiusPx) };
}

export const PHONE_VIEWPORT_CORNERS: readonly PhoneViewportCorner[] = [
  "topLeft",
  "topRight",
  "bottomRight",
  "bottomLeft",
] as const;

/** Apply rounded clip styles Firefox WebGL often ignores on distant ancestors. */
export function applyRoundedClipElementStyles(
  element: HTMLElement,
  radii: CornerRadiiPx,
): void {
  element.style.borderRadius = cornerRadiiBorderRadiusCss(radii);
  element.style.overflow = "hidden";
  element.style.clipPath = roundedInsetClipPath(radii);
  // Promote a local compositing layer so the clip is attached to this element.
  if (element.style.transform === "" || element.style.transform === "none") {
    element.style.transform = "translateZ(0)";
  }
}
