"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

import {
  SWIPE_MENU_HANDLE_ATTR,
  swipeMenuContentHeightPx,
  swipeMenuHeightAfterHandlePointerUp,
  swipeMenuHeightAfterPointerDelta,
  swipeMenuMaxHeightPx,
  swipeMenuPullIndicatorWidthCss,
  swipeMenuPointerTargetIsHandle,
  swipeMenuPointerTargetIsInteractive,
  swipeMenuSnapHeightPx,
  swipeMenuSnapTarget,
} from "../pure/SwipeMenu";

import { SwipeMenu as SwipeMenuConsts } from "../ComponentConstants";

export const SWIPE_MENU_SIDE_PADDING_PX = 10;
export const SWIPE_MENU_PRIMARY_BTN_BG_COLOR = "#171769";
export const SWIPE_MENU_PRIMARY_BTN_HEIGHT_PERCENTAGE = "25%";
export const SWIPE_MENU_PRIMARY_BTN_FONT_SIZE = 10;
export const SWIPE_MENU_PRIMARY_BTN_FONT_COLOR = "#FFFFFF";

export function swipeMenuPrimaryButtonWidthPx(viewportWidthPx: number): number {
  return Math.max(0, viewportWidthPx - 2 * SWIPE_MENU_SIDE_PADDING_PX);
}

export function swipeMenuPrimaryButtonHeightPx(viewportHeightPx: number): number {
  const pct = Number.parseFloat(SWIPE_MENU_PRIMARY_BTN_HEIGHT_PERCENTAGE);
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, (viewportHeightPx * pct) / 100);
}

export type SwipeMenuViewport = {
  widthPx: number;
  heightPx: number;
};

export const SwipeMenuViewportContext = createContext<SwipeMenuViewport>({
  widthPx: 0,
  heightPx: 0,
});

export function useSwipeMenuViewport(): SwipeMenuViewport {
  return useContext(SwipeMenuViewportContext);
}

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
    startClientY: number;
    startedOnHandle: boolean;
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
    if (swipeMenuPointerTargetIsInteractive(e.target)) return;
    measureViewport();
    dragRef.current = {
      pointerId: e.pointerId,
      lastClientY: e.clientY,
      startClientY: e.clientY,
      startedOnHandle: swipeMenuPointerTargetIsHandle(e.target),
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
    const pointerDeltaY = e.clientY - drag.startClientY;
    setHeightPx((current) => {
      const afterHandleTap = swipeMenuHeightAfterHandlePointerUp(
        drag.startedOnHandle,
        pointerDeltaY,
        current,
        inactiveHeightPx,
        dragMaxHeightPx,
      );
      if (afterHandleTap !== current) return afterHandleTap;

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
      <div
        aria-hidden="true"
        style={handleStripStyle}
        {...{ [SWIPE_MENU_HANDLE_ATTR]: "" }}
      >
        <div style={pullIndicatorStyle} />
      </div>
      {children != null && contentHeightPx > 0 ? (
        <SwipeMenuViewportContext.Provider
          value={{ widthPx: viewportSize.width, heightPx: viewportSize.height }}
        >
        <div
          style={{
            height: contentHeightPx,
            minHeight: 0,
            overflow: "auto",
            padding: "8px 0 12px",
            display: "flex",
            justifyContent: "center",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "stretch",
              gap: 8,
              width: swipeMenuPrimaryButtonWidthPx(viewportSize.width),
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            {children}
          </div>
        </div>
        </SwipeMenuViewportContext.Provider>
      ) : null}
    </div>
  );
}