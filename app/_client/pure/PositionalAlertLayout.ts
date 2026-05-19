import { PositionalAlertSide } from "../viewport2d/AlertSystem";
import { type Rect, type RectBorderWidths } from "../Utils";

export function rectPxFromDomRect(rect: DOMRect): Rect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

/** Parses a computed border width string (e.g. `"1px"`) to a finite px value. */
export function parseCssBorderWidthPx(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Insets a border-box rect inward by CSS border widths (background/padding edge). */
export function rectPxInsetByBorder(
  rect: Rect,
  borders: RectBorderWidths,
): Rect {
  return {
    left: rect.left + borders.left,
    top: rect.top + borders.top,
    width: Math.max(0, rect.width - borders.left - borders.right),
    height: Math.max(0, rect.height - borders.top - borders.bottom),
  };
}

export type PositionalAlertPlacement = {
  left: number;
  top: number;
  tailDirection: PositionalAlertSide;
  /** Horizontal offset of the tail apex from the bubble's left edge (px). */
  tailOffsetPx: number;
};

export const POSITIONAL_ALERT_TAIL_SIZE_PX = 10;
export const POSITIONAL_ALERT_DEFAULT_GAP_PX = 8;
export const POSITIONAL_ALERT_VIEWPORT_MARGIN_PX = 8;

function anchorCenter(anchor: Rect): { x: number; y: number } {
  return {
    x: anchor.left + anchor.width / 2,
    y: anchor.top + anchor.height / 2,
  };
}

function clampBubbleLeftInClip(
  centerX: number,
  bubbleWidth: number,
  clipRect: Rect,
  marginPx: number,
): number {
  const half = bubbleWidth / 2;
  const minLeft = clipRect.left + marginPx;
  const maxLeft = clipRect.left + clipRect.width - marginPx - bubbleWidth;
  return Math.min(maxLeft, Math.max(minLeft, centerX - half));
}

/**
 * CSS `clip-path: inset(...)` trimming `bounds` to `clipRect` (viewport px).
 * Returns undefined when `bounds` is fully inside `clipRect`.
 */
export function positionalAlertClipPathInset(
  bounds: Rect,
  clipRect: Rect,
): string | undefined {
  const boundsRight = bounds.left + bounds.width;
  const boundsBottom = bounds.top + bounds.height;
  const clipRight = clipRect.left + clipRect.width;
  const clipBottom = clipRect.top + clipRect.height;

  const insetTop = Math.max(0, clipRect.top - bounds.top);
  const insetLeft = Math.max(0, clipRect.left - bounds.left);
  const insetRight = Math.max(0, boundsRight - clipRight);
  const insetBottom = Math.max(0, boundsBottom - clipBottom);

  if (insetTop === 0 && insetLeft === 0 && insetRight === 0 && insetBottom === 0) {
    return undefined;
  }
  return `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;
}

/** Visual bounds of the bubble plus its tail in viewport coordinates. */
export function positionalAlertVisualBounds(
  placement: PositionalAlertPlacement,
  bubbleWidth: number,
  bubbleHeight: number,
  tailSizePx: number = POSITIONAL_ALERT_TAIL_SIZE_PX,
): Rect {
  const tailExtendsBelow = placement.tailDirection === "down";
  const tailExtendsAbove = placement.tailDirection === "up";
  return {
    left: placement.left,
    top: placement.top - (tailExtendsAbove ? tailSizePx : 0),
    width: bubbleWidth,
    height:
      bubbleHeight +
      (tailExtendsBelow ? tailSizePx : 0) +
      (tailExtendsAbove ? tailSizePx : 0),
  };
}

/**
 * Places a speech-bubble on the given `side` of `anchor`. The tail sits on the
 * bubble edge opposite `side` and points at the anchor. The tail face toward the
 * anchor is `parentEdgeOffsetPx` from the anchor's top (`side === "up"`) or bottom
 * (`side === "down"`). Bubble and tail move together vertically; horizontal tail
 * position follows the anchor center.
 */
export function positionalAlertPlacement(
  anchor: Rect,
  bubbleWidth: number,
  bubbleHeight: number,
  clipRect: Rect,
  side: PositionalAlertSide,
  tailSizePx: number = POSITIONAL_ALERT_TAIL_SIZE_PX,
  parentEdgeOffsetPx: number = POSITIONAL_ALERT_DEFAULT_GAP_PX,
  clipMarginPx: number = POSITIONAL_ALERT_VIEWPORT_MARGIN_PX,
): PositionalAlertPlacement {
  const clipTop = clipRect.top;
  const clipBottom = clipRect.top + clipRect.height;
  const center = anchorCenter(anchor);
  const left = clampBubbleLeftInClip(center.x, bubbleWidth, clipRect, clipMarginPx);
  const tailOffsetPx = center.x - left;

  if (side === "up") {
    const tailBottom = anchor.top - parentEdgeOffsetPx;
    const top = tailBottom - tailSizePx - bubbleHeight;
    const minTop = clipTop + clipMarginPx;
    const maxTop = clipBottom - clipMarginPx - bubbleHeight - tailSizePx;
    return {
      left,
      top: Math.min(maxTop, Math.max(minTop, top)),
      tailDirection: "down",
      tailOffsetPx,
    };
  }

  const tailTop = anchor.top + anchor.height + parentEdgeOffsetPx;
  const top = tailTop + tailSizePx;
  const minTop = clipTop + clipMarginPx + tailSizePx;
  const maxTop = clipBottom - clipMarginPx - bubbleHeight;
  return {
    left,
    top: Math.min(maxTop, Math.max(minTop, top)),
    tailDirection: "up",
    tailOffsetPx,
  };
}

export type PositionalAlertTailBox = {
  left: number;
  top: number;
  borderLeft: string;
  borderRight: string;
  borderTop: string;
  borderBottom: string;
};

/** Border-triangle box for the speech-bubble tail (CSS px). */
export function positionalAlertTailBox(
  placement: PositionalAlertPlacement,
  tailSizePx: number,
  bgColor: string,
): PositionalAlertTailBox {
  const half = tailSizePx;
  const offset = placement.tailOffsetPx;
  const transparent = "transparent";

  switch (placement.tailDirection) {
    case "down":
      return {
        left: offset - half,
        top: 0,
        borderLeft: `${half}px solid ${transparent}`,
        borderRight: `${half}px solid ${transparent}`,
        borderTop: `${half}px solid ${bgColor}`,
        borderBottom: "0 solid transparent",
      };
    case "up":
      return {
        left: offset - half,
        top: -tailSizePx,
        borderLeft: `${half}px solid ${transparent}`,
        borderRight: `${half}px solid ${transparent}`,
        borderBottom: `${half}px solid ${bgColor}`,
        borderTop: "0 solid transparent",
      };
  }
}
