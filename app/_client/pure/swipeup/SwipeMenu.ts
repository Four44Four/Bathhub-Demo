import * as Utils from "../../Utils";

export type SwipeMenuSnapTarget = "collapsed" | "expanded";

/** Height available for expandable menu content below the inactive handle strip. */
export function swipeMenuContentHeightPx(
  panelHeightPx: number,
  inactiveHeightPx: number,
): number {
  return Math.max(0, panelHeightPx - inactiveHeightPx);
}

/** Width of the pull indicator in CSS pixels from viewport width and ratio. */
export function swipeMenuPullIndicatorWidthPx(
  viewportWidthPx: number,
  widthRatio: number,
): number {
  if (!Number.isFinite(widthRatio) || widthRatio <= 0) return 0;
  if (!Number.isFinite(viewportWidthPx) || viewportWidthPx <= 0) return 0;
  return viewportWidthPx * widthRatio;
}

/** CSS width for the pull indicator as a percentage of its container. */
export function swipeMenuPullIndicatorWidthCss(widthRatio: number): string {
  if (!Number.isFinite(widthRatio) || widthRatio <= 0) return "0%";
  return `${widthRatio * 100}%`;
}

const CSS_RGB_RGBA_RE =
  /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)$/i;

/** Multiply the alpha channel of a CSS `rgb` / `rgba` color string. */
export function multiplyCssRgbaAlpha(
  colorCss: string,
  alphaFactor: number,
): string {
  const match = colorCss.trim().match(CSS_RGB_RGBA_RE);
  if (!match) return colorCss;
  const r = match[1];
  const g = match[2];
  const b = match[3];
  const alpha = match[4] !== undefined ? Number(match[4]) : 1;
  const factor = Number.isFinite(alphaFactor) ? alphaFactor : 1;
  const nextAlpha = Utils.clamp01(alpha * factor);
  return `rgba(${r}, ${g}, ${b}, ${nextAlpha})`;
}

/**
 * CSS `top` for the menu top-edge shadow strip inside the shell.
 * Opaque end sits `topCornerRadiusPx` below the shell top so rounded corners
 * stay covered.
 */
export function swipeMenuTopShadowTopPx(
  shadowHeightPx: number,
  topCornerRadiusPx: number,
): number {
  if (!Number.isFinite(shadowHeightPx) || shadowHeightPx < 0) return 0;
  if (!Number.isFinite(topCornerRadiusPx) || topCornerRadiusPx < 0) {
    return -shadowHeightPx;
  }
  return topCornerRadiusPx - shadowHeightPx;
}

/**
 * Shadow alpha multiplier at normalized height above the shadow start
 * (0 = start below top corners, 1 = shadow top). Quadratic ease-out: `(1 - t)²`.
 */
export function swipeMenuShadowAlphaAtProgress(progress01: number): number {
  const t = Utils.clamp01(progress01);
  const oneMinusT = 1 - t;
  return oneMinusT * oneMinusT;
}

/**
 * Upward fade from {@link shadowColorCss} (alpha scaled by `alphaFactor`) to
 * transparent for the swipe-up menu top-edge shadow strip.
 */
export function swipeMenuShadowGradient(
  shadowColorCss: string,
  alphaFactor: number,
  stopCount = 12,
): string {
  const stops: string[] = [];
  const n = Math.max(2, Math.floor(stopCount));
  for (let i = 0; i <= n; i += 1) {
    const progress = i / n;
    const positionPct = progress * 100;
    const color = multiplyCssRgbaAlpha(
      shadowColorCss,
      alphaFactor * swipeMenuShadowAlphaAtProgress(progress),
    );
    stops.push(`${color} ${positionPct}%`);
  }
  return `linear-gradient(to top, ${stops.join(", ")})`;
}

/**
 * Apply a vertical pointer delta to the menu height.
 * Screen Y grows downward, so dragging up (negative delta) increases height.
 */
export function swipeMenuHeightAfterPointerDelta(
  currentHeightPx: number,
  pointerDeltaYPx: number,
  inactiveHeightPx: number,
  maxHeightPx: number,
): number {
  const minH = Math.min(inactiveHeightPx, maxHeightPx);
  const maxH = Math.max(inactiveHeightPx, maxHeightPx);
  const next = currentHeightPx - pointerDeltaYPx;
  return Math.min(maxH, Math.max(minH, next));
}

/** Draggable range above the inactive handle height (0 when not expandable). */
export function swipeMenuExpandRangePx(
  inactiveHeightPx: number,
  maxHeightPx: number,
): number {
  return Math.max(0, maxHeightPx - inactiveHeightPx);
}

/**
 * Normalized open amount of the swipe-up menu (0 = collapsed handle strip, 1 = fully expanded).
 */
export function swipeMenuExpandProgress(
  heightPx: number,
  inactiveHeightPx: number,
  maxHeightPx: number,
): number {
  const range = swipeMenuExpandRangePx(inactiveHeightPx, maxHeightPx);
  if (range <= 0) return 0;
  const t = (heightPx - inactiveHeightPx) / range;
  return Utils.clamp01(t);
}

/** Backdrop opacity over the globe while the menu opens (matches {@link swipeMenuExpandProgress}). */
export function swipeMenuBackdropOpacity(
  heightPx: number,
  inactiveHeightPx: number,
  maxHeightPx: number,
): number {
  return swipeMenuExpandProgress(heightPx, inactiveHeightPx, maxHeightPx);
}

/** Linearly interpolate backdrop opacity for handle-toggle animations. */
export function swipeMenuBackdropOpacityLerp(
  fromOpacity: number,
  toOpacity: number,
  progress01: number,
): number {
  const t = Utils.clamp01(progress01);
  return fromOpacity + (toOpacity - fromOpacity) * t;
}

/** True when the menu can be dragged above its collapsed height. */
export function swipeMenuIsExpandable(
  inactiveHeightPx: number,
  maxHeightPx: number,
): boolean {
  return swipeMenuExpandRangePx(inactiveHeightPx, maxHeightPx) > 0;
}

/**
 * Resolved max expanded height from viewport height and expand ratio (0–1).
 * When `maxExpandRatio` is positive and the viewport is known, the result is
 * always strictly greater than `inactiveHeightPx` so dragging remains possible
 * even if `viewport * ratio` is smaller than the handle strip.
 */
export function swipeMenuMaxHeightPx(
  viewportHeightPx: number,
  maxExpandRatio: number,
  inactiveHeightPx: number,
): number {
  if (!Number.isFinite(maxExpandRatio) || maxExpandRatio <= 0) {
    return inactiveHeightPx;
  }
  if (!Number.isFinite(viewportHeightPx) || viewportHeightPx <= 0) {
    return inactiveHeightPx;
  }
  if (!Number.isFinite(inactiveHeightPx) || inactiveHeightPx < 0) {
    return 0;
  }
  const ratio = Math.min(1, Math.max(0, maxExpandRatio));
  const scaledMax = viewportHeightPx * ratio;
  if (scaledMax <= inactiveHeightPx) {
    return inactiveHeightPx + 1;
  }
  return scaledMax;
}

/**
 * On pointer release, choose collapsed vs expanded from current height.
 * `expandThresholdRatio` is the fraction of the draggable range above inactive
 * height required to snap open.
 */
export function swipeMenuSnapTarget(
  heightPx: number,
  inactiveHeightPx: number,
  maxHeightPx: number,
  expandThresholdRatio: number
): SwipeMenuSnapTarget {
  const range = maxHeightPx - inactiveHeightPx;
  if (range <= 0) return "collapsed";
  const t = (heightPx - inactiveHeightPx) / range;
  const threshold = Utils.clamp01(expandThresholdRatio);
  return t >= threshold ? "expanded" : "collapsed";
}

export function swipeMenuSnapHeightPx(
  target: SwipeMenuSnapTarget,
  inactiveHeightPx: number,
  maxHeightPx: number,
): number {
  return target === "expanded" ? maxHeightPx : inactiveHeightPx;
}

/** `data-*` attribute marking the pull-handle strip (tap toggles expand/collapse). */
export const SWIPE_MENU_HANDLE_ATTR = "data-swipe-menu-handle";

/** Max pointer travel (px) still treated as a tap on the handle. */
export const SWIPE_MENU_TAP_MAX_MOVEMENT_PX = 8;

/** True when the menu is at its fully expanded height. */
export function swipeMenuIsFullyExpanded(
  heightPx: number,
  inactiveHeightPx: number,
  maxHeightPx: number,
): boolean {
  if (!swipeMenuIsExpandable(inactiveHeightPx, maxHeightPx)) {
    return false;
  }
  return heightPx >= maxHeightPx;
}

/**
 * Height after the user taps/clicks the pull handle: expand to max when not
 * fully open, collapse when already at max.
 */
export function swipeMenuHeightAfterHandleToggle(
  currentHeightPx: number,
  inactiveHeightPx: number,
  maxHeightPx: number,
): number {
  if (!swipeMenuIsExpandable(inactiveHeightPx, maxHeightPx)) {
    return currentHeightPx;
  }
  if (swipeMenuIsFullyExpanded(currentHeightPx, inactiveHeightPx, maxHeightPx)) {
    return swipeMenuSnapHeightPx("collapsed", inactiveHeightPx, maxHeightPx);
  }
  return swipeMenuSnapHeightPx("expanded", inactiveHeightPx, maxHeightPx);
}

/** True when pointer movement from down to up is small enough to count as a tap. */
export function swipeMenuIsTapGesture(
  pointerDeltaYPx: number,
  maxMovementPx: number = SWIPE_MENU_TAP_MAX_MOVEMENT_PX,
): boolean {
  if (!Number.isFinite(maxMovementPx) || maxMovementPx < 0) return false;
  return Math.abs(pointerDeltaYPx) <= maxMovementPx;
}

/** True when the menu panel is taller than its collapsed handle strip. */
export function swipeMenuIsOpenAboveCollapsed(
  heightPx: number,
  inactiveHeightPx: number,
): boolean {
  return heightPx > inactiveHeightPx;
}

export type SwipeMenuViewportInteraction = {
  blocksViewportPointer: boolean;
  backdropOpacity: number;
  menuHeightPx: number;
};

/** Globe dimming and pointer blocking come only from the swipe menu, never immersive modes. */
export function swipeMenuViewportInteraction(
  immersiveModeActive: boolean,
  heightPx: number,
  inactiveHeightPx: number,
  menuBackdropOpacity: number,
): SwipeMenuViewportInteraction {
  if (immersiveModeActive) {
    return { blocksViewportPointer: false, backdropOpacity: 0, menuHeightPx: 0 };
  }
  return {
    blocksViewportPointer: swipeMenuIsOpenAboveCollapsed(
      heightPx,
      inactiveHeightPx,
    ),
    backdropOpacity: menuBackdropOpacity,
    menuHeightPx: heightPx,
  };
}

/**
 * On pointer release, toggle expand/collapse when the gesture started on the
 * handle and did not move enough to count as a drag. Otherwise returns
 * `currentHeightPx`.
 */
export function swipeMenuHeightAfterHandlePointerUp(
  startedOnHandle: boolean,
  pointerDeltaYPx: number,
  currentHeightPx: number,
  inactiveHeightPx: number,
  maxHeightPx: number,
  tapMaxMovementPx: number = SWIPE_MENU_TAP_MAX_MOVEMENT_PX,
): number {
  if (!startedOnHandle || !swipeMenuIsTapGesture(pointerDeltaYPx, tapMaxMovementPx)) {
    return currentHeightPx;
  }
  return swipeMenuHeightAfterHandleToggle(
    currentHeightPx,
    inactiveHeightPx,
    maxHeightPx,
  );
}

/** Quadratic ease-in-out progress for timed menu move animations. */
export function swipeMenuMoveEasingProgress01(linearProgress01: number): number {
  const t = Utils.clamp01(linearProgress01);
  if (t < 0.5) return 2 * t * t;
  return 1 - (-2 * t + 2) ** 2 / 2;
}

/** Interpolate menu height during a timed move animation. */
export function swipeMenuAnimatedHeightPx(
  fromHeightPx: number,
  toHeightPx: number,
  elapsedMs: number,
  durationMs: number,
): { heightPx: number; complete: boolean } {
  const linearProgress01 =
    durationMs > 0 ? Utils.clamp01(elapsedMs / durationMs) : 1;
  const progress01 = swipeMenuMoveEasingProgress01(linearProgress01);
  const heightPx = fromHeightPx + (toHeightPx - fromHeightPx) * progress01;
  return { heightPx, complete: linearProgress01 >= 1 };
}

/**
 * Height after an expand request (e.g. viewport2d hamburger button).
 * No-op when already fully expanded or not expandable.
 */
export function swipeMenuHeightAfterExpandRequest(
  currentHeightPx: number,
  inactiveHeightPx: number,
  maxHeightPx: number,
): number {
  if (!swipeMenuIsExpandable(inactiveHeightPx, maxHeightPx)) {
    return currentHeightPx;
  }
  if (swipeMenuIsFullyExpanded(currentHeightPx, inactiveHeightPx, maxHeightPx)) {
    return currentHeightPx;
  }
  return swipeMenuSnapHeightPx("expanded", inactiveHeightPx, maxHeightPx);
}

/** Collapse to the handle strip when the menu is open above collapsed height. */
export function swipeMenuHeightAfterOutsideTap(
  currentHeightPx: number,
  inactiveHeightPx: number,
  maxHeightPx: number,
): number {
  if (!swipeMenuIsOpenAboveCollapsed(currentHeightPx, inactiveHeightPx)) {
    return currentHeightPx;
  }
  return swipeMenuSnapHeightPx("collapsed", inactiveHeightPx, maxHeightPx);
}

const SWIPE_MENU_INTERACTIVE_SELECTOR =
  "button, a, input, textarea, select, [role='button']";

/** True when a pointer event target should receive clicks instead of starting a menu drag. */
export function swipeMenuPointerTargetIsInteractive(
  target: EventTarget | null,
): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) {
    return false;
  }
  return target.closest(SWIPE_MENU_INTERACTIVE_SELECTOR) != null;
}

/** True when a pointer event target is on the pull-handle strip. */
export function swipeMenuPointerTargetIsHandle(
  target: EventTarget | null,
): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) {
    return false;
  }
  return target.closest(`[${SWIPE_MENU_HANDLE_ATTR}]`) != null;
}
