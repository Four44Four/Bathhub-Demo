"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

import {
  swipeMenuContentHeightPx,
  swipeMenuHeightAfterPointerDelta,
  swipeMenuMaxHeightPx,
  swipeMenuPullIndicatorWidthCss,
  swipeMenuSnapHeightPx,
  swipeMenuSnapTarget,
} from "../pure/SwipeMenu";

import { SwipeMenu as SwipeMenuConsts } from "../ComponentConstants";

export type MainMenuProps = {
  /** Virtual phone frame; used for sizing and max expand height. */
  viewportRef: RefObject<HTMLElement | null>;
  children?: ReactNode;
  className?: string;
};

export function MainMenu({ viewportRef, children, className }: MainMenuProps) {
  const inactiveHeightPx = SwipeMenuConsts.INACTIVE_HEIGHT_PX;
  const dragRef = useRef<{
    pointerId: number;
    lastClientY: number;
  } | null>(null);

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [heightPx, setHeightPx] = useState(inactiveHeightPx);

  const resolveMaxHeightPx = useCallback(() => {
    const measuredHeight =
      viewportRef.current?.getBoundingClientRect().height ?? viewportSize.height;
    return swipeMenuMaxHeightPx(
      measuredHeight,
      SwipeMenuConsts.MAX_EXPAND_RATIO,
      inactiveHeightPx,
    );
  }, [viewportRef, viewportSize.height, inactiveHeightPx]);

  const maxHeightPx = resolveMaxHeightPx();

  const contentHeightPx = swipeMenuContentHeightPx(heightPx, inactiveHeightPx);

  const measureViewport = useCallback(() => {
    const target = viewportRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    setViewportSize({
      width: rect.width,
      height: rect.height,
    });
  }, [viewportRef]);

  useLayoutEffect(() => {
    measureViewport();
    const target = viewportRef.current;
    if (!target || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureViewport());
    ro.observe(target);
    return () => ro.disconnect();
  }, [measureViewport, viewportRef]);

  useLayoutEffect(() => {
    setHeightPx((h) => Math.min(Math.max(h, inactiveHeightPx), maxHeightPx));
  }, [inactiveHeightPx, maxHeightPx]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    measureViewport();
    dragRef.current = {
      pointerId: e.pointerId,
      lastClientY: e.clientY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const deltaY = e.clientY - drag.lastClientY;
    drag.lastClientY = e.clientY;
    const dragMaxHeightPx = resolveMaxHeightPx();
    setHeightPx((current) =>
      swipeMenuHeightAfterPointerDelta(
        current,
        deltaY,
        inactiveHeightPx,
        dragMaxHeightPx,
      ),
    );
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const dragMaxHeightPx = resolveMaxHeightPx();
    setHeightPx((current) => {
      const target = swipeMenuSnapTarget(
        current,
        inactiveHeightPx,
        dragMaxHeightPx,
        SwipeMenuConsts.EXPAND_SNAP_THRESHOLD_RATIO,
      );
      return swipeMenuSnapHeightPx(target, inactiveHeightPx, dragMaxHeightPx);
    });
  };

  const shellStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: heightPx,
    minHeight: inactiveHeightPx,
    backgroundColor: SwipeMenuConsts.BG_COLOR,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    boxSizing: "border-box",
    touchAction: "none",
    pointerEvents: "auto",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  const handleStripStyle: CSSProperties = {
    height: inactiveHeightPx,
    minHeight: inactiveHeightPx,
    flexShrink: 0,
    display: "flex",
    justifyContent: "center",
    width: "100%",
    boxSizing: "border-box",
    paddingTop: SwipeMenuConsts.PULL_HANDLE_MARGIN_PX,
    paddingBottom: SwipeMenuConsts.PULL_HANDLE_MARGIN_PX,
  };

  const pullIndicatorStyle: CSSProperties = {
    width: swipeMenuPullIndicatorWidthCss(SwipeMenuConsts.PULL_HANDLE_WIDTH_RATIO),
    height: SwipeMenuConsts.PULL_HANDLE_HEIGHT_PX,
    minHeight: SwipeMenuConsts.PULL_HANDLE_HEIGHT_PX,
    borderRadius: SwipeMenuConsts.PULL_HANDLE_RADIUS_PX,
    backgroundColor: SwipeMenuConsts.PULL_HANDLE_BG_COLOR,
    flexShrink: 0,
    display: "block",
  };

  return (
    <div
      className={className}
      style={shellStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div aria-hidden="true" style={handleStripStyle}>
        <div style={pullIndicatorStyle} />
      </div>
      {children != null && contentHeightPx > 0 ? (
        <div
          style={{
            height: contentHeightPx,
            minHeight: 0,
            overflow: "auto",
            padding: "8px 12px 12px",
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}