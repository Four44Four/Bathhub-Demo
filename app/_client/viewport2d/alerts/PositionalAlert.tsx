"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  anchorBoundingRectPx,
  positionalAlertAnchorIsAttached,
  positionalAlertZIndexForAnchor,
  subscribePositionalAlertAnchorLayout,
} from "../../pure/viewport2d/PositionalAlertAnchor";
import {
  positionalAlertClipPathInset,
  positionalAlertPlacement,
  positionalAlertTailBox,
  positionalAlertVisualBounds,
  POSITIONAL_ALERT_TAIL_SIZE_PX,
} from "../../pure/viewport2d/PositionalAlertLayout";
import { TextWeight, type Rect } from "../../Utils";
import { PositionalAlertSide } from "../AlertSystem";

import { Alerts as AlertConsts } from "../../ComponentConstants";

/** Gap from the anchor's top/bottom edge to the tail face pointing at the anchor (px). */
export const POS_ALERT_MARGIN_PX = 2;

const BUBBLE_PADDING_X_PX = 14;
const BUBBLE_PADDING_Y_PX = 10;
const BUBBLE_BORDER_RADIUS_PX = 10;
const BUBBLE_MIN_WIDTH_PX = 120;
const BUBBLE_MAX_WIDTH_PX = 280;
const BUBBLE_FONT_SIZE_PX = 14;
const BUBBLE_LINE_HEIGHT_RATIO = 1.3;
const BUBBLE_LINE_HEIGHT_PX = BUBBLE_FONT_SIZE_PX * BUBBLE_LINE_HEIGHT_RATIO;

export type PositionalAlertProps = {
  anchorElement: HTMLElement;
  message: string;
  side: PositionalAlertSide;
  clipRect: Rect | null;
  onDismiss: () => void;
};

function measureBubbleSize(message: string): { width: number; height: number } {
  const charWidth = 7.2;
  const lineHeight = BUBBLE_LINE_HEIGHT_PX;
  const innerMax = BUBBLE_MAX_WIDTH_PX - BUBBLE_PADDING_X_PX * 2;
  const charsPerLine = Math.max(8, Math.floor(innerMax / charWidth));
  const lines = Math.max(1, Math.ceil(message.length / charsPerLine));
  const width = Math.min(
    BUBBLE_MAX_WIDTH_PX,
    Math.max(
      BUBBLE_MIN_WIDTH_PX,
      Math.min(innerMax, message.length * charWidth) + BUBBLE_PADDING_X_PX * 2,
    ),
  );
  const height = lines * lineHeight + BUBBLE_PADDING_Y_PX * 2;
  return { width, height };
}

export function PositionalAlert({
  anchorElement,
  message,
  side,
  clipRect,
  onDismiss,
}: PositionalAlertProps) {
  const bubbleSize = useMemo(() => measureBubbleSize(message), [message]);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<Rect | null>(null);
  const [stackZIndex, setStackZIndex] = useState(0);
  const [renderedBubbleHeightPx, setRenderedBubbleHeightPx] = useState(bubbleSize.height);

  const updateAnchorLayout = useCallback(() => {
    setAnchorRect(anchorBoundingRectPx(anchorElement));
    setStackZIndex(positionalAlertZIndexForAnchor(anchorElement, (el) => getComputedStyle(el)));
  }, [anchorElement]);

  useLayoutEffect(() => {
    if (!positionalAlertAnchorIsAttached(anchorElement)) {
      onDismiss();
      return;
    }
    updateAnchorLayout();
    return subscribePositionalAlertAnchorLayout(anchorElement, {
      onLayoutChange: updateAnchorLayout,
      onAnchorDetached: onDismiss,
    });
  }, [anchorElement, onDismiss, updateAnchorLayout]);

  useLayoutEffect(() => {
    setRenderedBubbleHeightPx(bubbleSize.height);
  }, [message, bubbleSize.height]);

  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (el == null) return;
    const nextHeight = el.offsetHeight;
    if (nextHeight > 0 && nextHeight !== renderedBubbleHeightPx) {
      setRenderedBubbleHeightPx(nextHeight);
    }
  }, [message, anchorRect, clipRect, side, renderedBubbleHeightPx]);

  const placement = useMemo(() => {
    if (anchorRect == null || clipRect == null) return null;
    return positionalAlertPlacement(
      anchorRect,
      bubbleSize.width,
      renderedBubbleHeightPx,
      clipRect,
      side,
      POSITIONAL_ALERT_TAIL_SIZE_PX,
      POS_ALERT_MARGIN_PX,
    );
  }, [anchorRect, bubbleSize.width, clipRect, renderedBubbleHeightPx, side]);

  const clipPath = useMemo(() => {
    if (placement == null || clipRect == null) return undefined;
    return positionalAlertClipPathInset(
      positionalAlertVisualBounds(placement, bubbleSize.width, renderedBubbleHeightPx),
      clipRect,
    );
  }, [bubbleSize.width, clipRect, placement, renderedBubbleHeightPx]);

  const tailBox =
    placement == null
      ? null
      : positionalAlertTailBox(
          placement,
          POSITIONAL_ALERT_TAIL_SIZE_PX,
          AlertConsts.ACCENT_COLOR,
        );

  const bubbleStyle: CSSProperties =
    placement == null
      ? { visibility: "hidden" }
      : {
          position: "fixed",
          left: placement.left,
          top: placement.top,
          width: bubbleSize.width,
          height: renderedBubbleHeightPx,
          padding: `${BUBBLE_PADDING_Y_PX}px ${BUBBLE_PADDING_X_PX}px`,
          borderRadius: BUBBLE_BORDER_RADIUS_PX,
          backgroundColor: AlertConsts.ACCENT_COLOR,
          color: AlertConsts.TEXT_COLOR,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          zIndex: stackZIndex,
          clipPath,
          pointerEvents: "none",
        };

  const tailStyle: CSSProperties | undefined =
    tailBox == null || placement == null
      ? undefined
      : {
          position: "absolute",
          left: tailBox.left,
          top: placement.tailDirection === "down" ? "100%" : tailBox.top,
          width: 0,
          height: 0,
          borderLeft: tailBox.borderLeft,
          borderRight: tailBox.borderRight,
          borderTop: tailBox.borderTop,
          borderBottom: tailBox.borderBottom,
          pointerEvents: "none",
        };

  return (
    <div ref={bubbleRef} role="alert" style={bubbleStyle}>
      <span
        className={TextWeight.REGULAR}
        style={{
          width: "100%",
          fontSize: BUBBLE_FONT_SIZE_PX,
          lineHeight: BUBBLE_LINE_HEIGHT_RATIO,
          textAlign: "center",
        }}
      >
        {message}
      </span>
      {tailStyle ? <div aria-hidden style={tailStyle} /> : null}
    </div>
  );
}
