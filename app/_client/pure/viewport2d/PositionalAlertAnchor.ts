import type { PositionalAlertRecord } from "./AlertSystemState";
import {
  parseCssBorderWidthPx,
  rectPxFromDomRect,
  rectPxInsetByBorder
} from "./PositionalAlertLayout";
import { type Rect } from "../../Utils";

export function positionalAlertAnchorIsAttached(
  anchor: HTMLElement,
  isNodeInDocument: (node: Node) => boolean = defaultIsNodeInDocument,
): boolean {
  if (typeof anchor.isConnected === "boolean") {
    return anchor.isConnected;
  }
  return isNodeInDocument(anchor);
}

function defaultIsNodeInDocument(node: Node): boolean {
  if (typeof document === "undefined") return false;
  return document.contains(node);
}

/** Alert ids whose anchors are missing or no longer in the document. */
export function positionalAlertIdsWithDetachedAnchors(
  records: readonly PositionalAlertRecord[],
  getAnchor: (id: string) => HTMLElement | undefined,
  isAttached: (anchor: HTMLElement) => boolean = positionalAlertAnchorIsAttached,
): string[] {
  return records.flatMap((record) => {
    const anchor = getAnchor(record.id);
    if (anchor == null || !isAttached(anchor)) return [record.id];
    return [];
  });
}

/** Matches swipe menu wrapper `z-40` in `app/page.tsx`. */
export const SWIPE_MENU_LAYER_Z_INDEX = 40;

/** Renders the bubble just above its anchor layer without crossing the next UI tier. */
export const POSITIONAL_ALERT_Z_STACK_OFFSET = 10;

export type CssComputedStyleReader = (element: Element) => {
  zIndex: string;
};

function readElementZIndex(
  element: Element,
  getComputedStyle: CssComputedStyleReader,
): number | null {
  const zIndex = getComputedStyle(element).zIndex;
  if (zIndex === "auto") return null;
  const parsed = Number.parseInt(zIndex, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Highest explicit `z-index` on `anchor` or any ancestor. */
export function positionalAlertMaxAncestorZIndex(
  anchor: HTMLElement,
  getComputedStyle: CssComputedStyleReader,
): number {
  let maxZ = 0;
  let current: HTMLElement | null = anchor;
  while (current) {
    const z = readElementZIndex(current, getComputedStyle);
    if (z != null) maxZ = Math.max(maxZ, z);
    current = current.parentElement;
  }
  return maxZ;
}

/** True when an ancestor sits on the swipe menu layer (expanded menu chrome). */
export function positionalAlertIsUnderSwipeMenuLayer(
  anchor: HTMLElement,
  getComputedStyle: CssComputedStyleReader,
  swipeMenuLayerZ: number = SWIPE_MENU_LAYER_Z_INDEX,
): boolean {
  let current: HTMLElement | null = anchor.parentElement;
  while (current) {
    const z = readElementZIndex(current, getComputedStyle);
    if (z != null && z >= swipeMenuLayerZ) return true;
    current = current.parentElement;
  }
  return false;
}

/**
 * Positions the bubble above its anchor's stacking tier. Viewport2d anchors stay
 * below the swipe menu; menu anchors may render above the menu panel.
 */
export function positionalAlertZIndexForAnchor(
  anchor: HTMLElement,
  getComputedStyle: CssComputedStyleReader,
  swipeMenuLayerZ: number = SWIPE_MENU_LAYER_Z_INDEX,
  stackOffset: number = POSITIONAL_ALERT_Z_STACK_OFFSET,
): number {
  const maxZ = positionalAlertMaxAncestorZIndex(anchor, getComputedStyle);
  const stackedZ = maxZ + stackOffset;
  if (positionalAlertIsUnderSwipeMenuLayer(anchor, getComputedStyle, swipeMenuLayerZ)) {
    return stackedZ;
  }
  return Math.min(stackedZ, swipeMenuLayerZ - 1);
}

export type CssBorderStyleReader = (element: Element) => Pick<
  CSSStyleDeclaration,
  "borderTopWidth" | "borderRightWidth" | "borderBottomWidth" | "borderLeftWidth"
>;

function defaultReadBorderStyle(element: Element): Pick<
  CSSStyleDeclaration,
  "borderTopWidth" | "borderRightWidth" | "borderBottomWidth" | "borderLeftWidth"
> {
  if (typeof getComputedStyle !== "function") {
    return {
      borderTopWidth: "0px",
      borderRightWidth: "0px",
      borderBottomWidth: "0px",
      borderLeftWidth: "0px",
    };
  }
  return getComputedStyle(element);
}

/**
 * Viewport rect of the anchor's painted background (border box minus CSS borders).
 * `getBoundingClientRect()` includes borders; alerts should meet the fill edge.
 */
export function anchorBoundingRectPx(
  anchor: HTMLElement,
  readBorderStyle: CssBorderStyleReader = defaultReadBorderStyle,
): Rect {
  const borderBox = rectPxFromDomRect(anchor.getBoundingClientRect());
  const style = readBorderStyle(anchor);
  return rectPxInsetByBorder(borderBox, {
    top: parseCssBorderWidthPx(style.borderTopWidth),
    right: parseCssBorderWidthPx(style.borderRightWidth),
    bottom: parseCssBorderWidthPx(style.borderBottomWidth),
    left: parseCssBorderWidthPx(style.borderLeftWidth),
  });
}

export function anchorClientRectChanged(prev: Rect | null, next: Rect): boolean {
  if (prev == null) return true;
  return (
    prev.left !== next.left ||
    prev.top !== next.top ||
    prev.width !== next.width ||
    prev.height !== next.height
  );
}

export function collectOffsetAncestors(anchor: HTMLElement): HTMLElement[] {
  const ancestors: HTMLElement[] = [];
  let current: HTMLElement | null = anchor.parentElement;
  while (current) {
    ancestors.push(current);
    current = current.parentElement;
  }
  return ancestors;
}

function elementIsScrollable(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  const canScrollY =
    style.overflowY === "auto" ||
    style.overflowY === "scroll" ||
    style.overflowY === "overlay";
  const canScrollX =
    style.overflowX === "auto" ||
    style.overflowX === "scroll" ||
    style.overflowX === "overlay";
  return canScrollY || canScrollX;
}

export function collectScrollableAncestors(anchor: HTMLElement): HTMLElement[] {
  const scrollable: HTMLElement[] = [];
  let current: HTMLElement | null = anchor.parentElement;
  while (current) {
    if (elementIsScrollable(current)) scrollable.push(current);
    current = current.parentElement;
  }
  return scrollable;
}

type LayoutListenerTarget = {
  addEventListener: (
    type: string,
    listener: () => void,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  removeEventListener: (
    type: string,
    listener: () => void,
    options?: boolean | AddEventListenerOptions,
  ) => void;
};

type ResizeObserverLike = {
  observe: (target: Element) => void;
  disconnect: () => void;
};

type PositionalAlertAnchorLayoutDeps = {
  createResizeObserver: (callback: () => void) => ResizeObserverLike;
  requestAnimationFrame: (callback: () => void) => number;
  cancelAnimationFrame: (id: number) => void;
  layoutListenerTarget: LayoutListenerTarget;
};

const defaultAnchorLayoutDeps = (): PositionalAlertAnchorLayoutDeps => ({
  createResizeObserver: (callback) => new ResizeObserver(callback),
  requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
  cancelAnimationFrame: (id) => window.cancelAnimationFrame(id),
  layoutListenerTarget: window,
});

export type PositionalAlertAnchorLayoutCallbacks = {
  onLayoutChange: () => void;
  onAnchorDetached?: () => void;
};

/**
 * Keeps `onLayoutChange` in sync when the anchor moves on screen (parent resize,
 * internal scroll, window scroll/resize, or CSS layout animation).
 * Invokes `onAnchorDetached` when the anchor leaves the document (e.g. parent unmount).
 */
export function subscribePositionalAlertAnchorLayout(
  anchorElement: HTMLElement,
  callbacks: PositionalAlertAnchorLayoutCallbacks,
  deps?: PositionalAlertAnchorLayoutDeps,
): () => void {
  const { onLayoutChange, onAnchorDetached } = callbacks;
  let detachNotified = false;
  const notifyDetached = () => {
    if (detachNotified) return;
    detachNotified = true;
    onAnchorDetached?.();
  };

  if (!positionalAlertAnchorIsAttached(anchorElement)) {
    notifyDetached();
    return () => {};
  }

  const resolvedDeps = deps ?? defaultAnchorLayoutDeps();
  const captureOpts: AddEventListenerOptions = { capture: true };
  const notify = () => {
    if (!positionalAlertAnchorIsAttached(anchorElement)) {
      notifyDetached();
      return;
    }
    onLayoutChange();
  };

  const resizeObserver = resolvedDeps.createResizeObserver(notify);
  resizeObserver.observe(anchorElement);
  for (const ancestor of collectOffsetAncestors(anchorElement)) {
    resizeObserver.observe(ancestor);
  }

  const { layoutListenerTarget } = resolvedDeps;
  layoutListenerTarget.addEventListener("scroll", notify, captureOpts);
  layoutListenerTarget.addEventListener("resize", notify);

  const scrollableAncestors =
    typeof getComputedStyle === "function"
      ? collectScrollableAncestors(anchorElement)
      : [];
  for (const scrollable of scrollableAncestors) {
    scrollable.addEventListener("scroll", notify, captureOpts);
  }

  let lastRect: Rect | null = null;
  let rafId = 0;
  const tick = () => {
    if (!positionalAlertAnchorIsAttached(anchorElement)) {
      notifyDetached();
      return;
    }
    const nextRect = anchorBoundingRectPx(anchorElement);
    if (anchorClientRectChanged(lastRect, nextRect)) {
      lastRect = nextRect;
      onLayoutChange();
    }
    rafId = resolvedDeps.requestAnimationFrame(tick);
  };
  rafId = resolvedDeps.requestAnimationFrame(tick);

  return () => {
    resizeObserver.disconnect();
    layoutListenerTarget.removeEventListener("scroll", notify, captureOpts);
    layoutListenerTarget.removeEventListener("resize", notify);
    for (const scrollable of scrollableAncestors) {
      scrollable.removeEventListener("scroll", notify, captureOpts);
    }
    resolvedDeps.cancelAnimationFrame(rafId);
  };
}

type ClipRectTrackingDeps = PositionalAlertAnchorLayoutDeps;

/**
 * Tracks a clip element's viewport rect (e.g. virtual phone frame) for alert placement.
 */
export function subscribePositionalAlertClipRect(
  clipElement: HTMLElement,
  onClipRectChange: (clipRect: Rect) => void,
  deps?: ClipRectTrackingDeps,
): () => void {
  const resolvedDeps = deps ?? defaultAnchorLayoutDeps();
  const captureOpts: AddEventListenerOptions = { capture: true };
  const notify = () => onClipRectChange(rectPxFromDomRect(clipElement.getBoundingClientRect()));

  notify();

  const resizeObserver = resolvedDeps.createResizeObserver(notify);
  resizeObserver.observe(clipElement);

  const { layoutListenerTarget } = resolvedDeps;
  layoutListenerTarget.addEventListener("scroll", notify, captureOpts);
  layoutListenerTarget.addEventListener("resize", notify);

  let lastRect: Rect | null = null;
  let rafId = 0;
  const tick = () => {
    const nextRect = rectPxFromDomRect(clipElement.getBoundingClientRect());
    if (anchorClientRectChanged(lastRect, nextRect)) {
      lastRect = nextRect;
      onClipRectChange(nextRect);
    }
    rafId = resolvedDeps.requestAnimationFrame(tick);
  };
  rafId = resolvedDeps.requestAnimationFrame(tick);

  return () => {
    resizeObserver.disconnect();
    layoutListenerTarget.removeEventListener("scroll", notify, captureOpts);
    layoutListenerTarget.removeEventListener("resize", notify);
    resolvedDeps.cancelAnimationFrame(rafId);
  };
}
