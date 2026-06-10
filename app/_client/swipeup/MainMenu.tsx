"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { useAnimatedOpacity } from "../useAnimatedOpacity";
import { addBathroomModeSwipeMenuRestoreTarget } from "../pure/viewport2d/AddBathroomModeState";

import {
  SWIPE_MENU_HANDLE_ATTR,
  swipeMenuBackdropOpacity,
  swipeMenuContentHeightPx,
  swipeMenuHeightAfterHandlePointerUp,
  swipeMenuHeightAfterOutsideTap,
  swipeMenuHeightAfterPointerDelta,
  swipeMenuIsOpenAboveCollapsed,
  swipeMenuMaxHeightPx,
  swipeMenuPullIndicatorWidthCss,
  swipeMenuPointerTargetIsHandle,
  swipeMenuPointerTargetIsInteractive,
  swipeMenuSnapHeightPx,
  swipeMenuSnapTarget,
} from "../pure/swipeup/SwipeMenu";

import { subscribeOnTap, TAP_MAX_MOVEMENT_PX } from "../NonDragTapDetector";
import { SwipeMenu as SwipeMenuConsts } from "../ComponentConstants";
import {
  suppressViewportClicksBriefly,
  type SwipeMenuInteraction,
} from "./SwipeMenuInteraction";
import { useAddBathroomMode } from "../viewport2d/add-bathroom-mode";

export function swipeMenuPrimaryButtonWidthPx(viewportWidthPx: number): number {
  return Math.max(0, viewportWidthPx - 2 * SwipeMenuConsts.SIDE_PADDING_PX);
}

export function swipeMenuPrimaryButtonItemWidthPx(viewportWidthPx: number): number {
  return Math.max(
    0,
    viewportWidthPx * SwipeMenuConsts.PRIMARY_BTN_WIDTH_RATIO,
  );
}

export function swipeMenuPrimaryButtonHeightPx(): number {
  const heightPx = SwipeMenuConsts.PRIMARY_BTN_HEIGHT_PX;
  if (!Number.isFinite(heightPx)) return 0;
  return Math.max(0, heightPx);
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
  /** Fired when open/expanded state changes (controls viewport pointer blocking). */
  onInteractionChange?: (interaction: SwipeMenuInteraction) => void;
};

export function MainMenu({
  viewportRef,
  children,
  className,
  onInteractionChange,
}: MainMenuProps) {
  const {
    isActive: addBathroomModeActive,
    registerExitHandler,
  } = useAddBathroomMode();
  const inactiveHeightPx = SwipeMenuConsts.INACTIVE_HEIGHT_PX;
  const dragRef = useRef<{
    pointerId: number;
    lastClientY: number;
    startClientY: number;
    startedOnHandle: boolean;
  } | null>(null);
  const outsideDismissRef = useRef<HTMLDivElement>(null);

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [heightPx, setHeightPx] = useState(inactiveHeightPx);
  const {
    opacity: backdropOpacity,
    animateTo: animateBackdropOpacityTo,
    setImmediate: setBackdropOpacityImmediate,
  } = useAnimatedOpacity();

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
  const isOpenAboveCollapsed = swipeMenuIsOpenAboveCollapsed(
    heightPx,
    inactiveHeightPx,
  );

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

  useLayoutEffect(() => {
    if (addBathroomModeActive) {
      setHeightPx(0);
      setBackdropOpacityImmediate(0);
    }
  }, [addBathroomModeActive, setBackdropOpacityImmediate]);

  useEffect(() => {
    return registerExitHandler(({ withNewBathroom }) => {
      const dragMaxHeightPx = resolveMaxHeightPx();
      const restoreTarget = addBathroomModeSwipeMenuRestoreTarget(withNewBathroom);
      const targetHeightPx =
        restoreTarget === "expanded" ? dragMaxHeightPx : inactiveHeightPx;
      setHeightPx(targetHeightPx);
      animateBackdropOpacityTo(
        swipeMenuBackdropOpacity(
          targetHeightPx,
          inactiveHeightPx,
          dragMaxHeightPx,
        ),
      );
    });
  }, [
    animateBackdropOpacityTo,
    inactiveHeightPx,
    registerExitHandler,
    resolveMaxHeightPx,
  ]);

  const collapseIfOpenAboveCollapsedRef = useRef<() => void>(() => {});
  collapseIfOpenAboveCollapsedRef.current = () => {
    const dragMaxHeightPx = resolveMaxHeightPx();
    setHeightPx((current) => {
      const next = swipeMenuHeightAfterOutsideTap(
        current,
        inactiveHeightPx,
        dragMaxHeightPx,
      );
      setBackdropOpacityImmediate(
        swipeMenuBackdropOpacity(next, inactiveHeightPx, dragMaxHeightPx),
      );
      return next;
    });
  };

  useEffect(() => {
    if (!isOpenAboveCollapsed) return;
    const el = outsideDismissRef.current;
    if (!el) return;
    return subscribeOnTap(
      () => {
        suppressViewportClicksBriefly();
        collapseIfOpenAboveCollapsedRef.current();
      },
      el,
      TAP_MAX_MOVEMENT_PX,
      true,
    );
  }, [isOpenAboveCollapsed]);

  useEffect(() => {
    onInteractionChange?.({
      blocksViewportPointer: isOpenAboveCollapsed,
      backdropOpacity,
    });
  }, [isOpenAboveCollapsed, backdropOpacity, onInteractionChange]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (addBathroomModeActive) return;
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
    setHeightPx((current) => {
      const next = swipeMenuHeightAfterPointerDelta(
        current,
        deltaY,
        inactiveHeightPx,
        dragMaxHeightPx,
      );
      setBackdropOpacityImmediate(
        swipeMenuBackdropOpacity(next, inactiveHeightPx, dragMaxHeightPx),
      );
      return next;
    });
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
      if (afterHandleTap !== current) {
        animateBackdropOpacityTo(
          swipeMenuBackdropOpacity(
            afterHandleTap,
            inactiveHeightPx,
            dragMaxHeightPx,
          ),
        );
        return afterHandleTap;
      }

      const target = swipeMenuSnapTarget(
        current,
        inactiveHeightPx,
        dragMaxHeightPx,
        SwipeMenuConsts.EXPAND_SNAP_THRESHOLD_RATIO,
      );
      const snapped = swipeMenuSnapHeightPx(
        target,
        inactiveHeightPx,
        dragMaxHeightPx,
      );
      setBackdropOpacityImmediate(
        swipeMenuBackdropOpacity(snapped, inactiveHeightPx, dragMaxHeightPx),
      );
      return snapped;
    });
  };

  const shellStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: heightPx,
    minHeight: addBathroomModeActive ? 0 : inactiveHeightPx,
    backgroundColor: SwipeMenuConsts.BG_COLOR,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    boxSizing: "border-box",
    touchAction: "none",
    pointerEvents: "auto",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    zIndex: 1,
  };

  const outsideDismissStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "auto",
    touchAction: "none",
    zIndex: 0,
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
    <>
      {isOpenAboveCollapsed && !addBathroomModeActive ? (
        <div
          ref={outsideDismissRef}
          aria-hidden="true"
          style={outsideDismissStyle}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
          }}
        />
      ) : null}
    <div
      className={className}
      style={shellStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {!addBathroomModeActive ? (
        <div
          aria-hidden="true"
          style={handleStripStyle}
          {...{ [SWIPE_MENU_HANDLE_ATTR]: "" }}
        >
          <div style={pullIndicatorStyle} />
        </div>
      ) : null}
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
    </>
  );
}