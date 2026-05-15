import * as Utils from "../Utils";

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
