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
import { viewport2dChromeHidden } from "../pure/viewport2d/FindNearestBathroomState";

import {
  SWIPE_MENU_HANDLE_ATTR,
  swipeMenuAnimatedHeightPx,
  swipeMenuBackdropOpacity,
  swipeMenuContentHeightPx,
  swipeMenuHeightAfterHandlePointerUp,
  swipeMenuHeightAfterOutsideTap,
  swipeMenuHeightAfterExpandRequest,
  swipeMenuHeightAfterPointerDelta,
  swipeMenuIsOpenAboveCollapsed,
  swipeMenuMaxHeightPx,
  swipeMenuPullIndicatorWidthCss,
  swipeMenuPointerTargetIsHandle,
  swipeMenuPointerTargetIsInteractive,
  swipeMenuSnapHeightPx,
  swipeMenuSnapTarget,
  swipeMenuViewportInteraction,
} from "../pure/swipeup/SwipeMenu";

import { subscribeOnTap, TAP_MAX_MOVEMENT_PX } from "../NonDragTapDetector";
import { SwipeMenu as SwipeMenuConsts } from "../ComponentConstants";
import { swipeMenuPageContentMinHeightPx, swipeMenuShouldOpenMainMenuOnHandleDragMove } from "../pure/swipeup/SwipeMenuPage";
import {
  swipeMenuIsFullyExpanded,
  type SwipeMenuSnapTarget,
} from "../pure/swipeup/SwipeMenu";
import {
  suppressViewportClicksBriefly,
  type SwipeMenuInteraction,
} from "./SwipeMenuInteraction";
import { useRegisterSwipeMenuExpandHandler } from "./SwipeMenuExpansion";
import { useSwipeMenuPage } from "./SwipeMenuPageContext";
import { useAddBathroomMode } from "../viewport2d/add-bathroom-mode";
import { useBathroomNavigationMode } from "../viewport2d/bathroom-navigation-mode";

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

export type SwipeMenuShellProps = {
  /** Virtual phone frame; used for sizing and max expand height. */
  viewportRef: RefObject<HTMLElement | null>;
  children?: ReactNode;
  className?: string;
  /** Fired when open/expanded state changes (controls viewport pointer blocking). */
  onInteractionChange?: (interaction: SwipeMenuInteraction) => void;
};

export function SwipeMenuShell({
  viewportRef,
  children,
  className,
  onInteractionChange,
}: SwipeMenuShellProps) {
  const {
    isActive: addBathroomModeActive,
    registerExitHandler,
  } = useAddBathroomMode();
  const {
    isPreviewActive: bathroomNavigationPreviewActive,
  } = useBathroomNavigationMode();
  const registerExpandHandler = useRegisterSwipeMenuExpandHandler();
  const { pageId, navigateToPage } = useSwipeMenuPage();
  const immersiveModeActive = viewport2dChromeHidden({
    addBathroomModeActive,
    bathroomNavigationPreviewActive,
  });
  const inactiveHeightPx = SwipeMenuConsts.INACTIVE_HEIGHT_PX;
  const dragRef = useRef<{
    pointerId: number;
    lastClientY: number;
    startClientY: number;
    startHeightPx: number;
    startedOnHandle: boolean;
  } | null>(null);
  const openedMainMenuThisHandleDragRef = useRef(false);
  const heightPxRef = useRef(inactiveHeightPx);
  const heightAnimFrameRef = useRef<number | null>(null);
  const outsideDismissRef = useRef<HTMLDivElement>(null);

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [heightPx, setHeightPx] = useState(inactiveHeightPx);
  heightPxRef.current = heightPx;
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

  const menuHeightPx = immersiveModeActive ? 0 : heightPx;
  const menuBackdropOpacity = immersiveModeActive ? 0 : backdropOpacity;
  const isOpenAboveCollapsed = swipeMenuIsOpenAboveCollapsed(
    menuHeightPx,
    inactiveHeightPx,
  );

  const contentHeightPx = swipeMenuContentHeightPx(menuHeightPx, inactiveHeightPx);
  const menuContentVisible = contentHeightPx > 0;

  const measureViewport = useCallback(() => {
    const target = viewportRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const nextMaxHeightPx = swipeMenuMaxHeightPx(
      rect.height,
      SwipeMenuConsts.MAX_EXPAND_RATIO,
      inactiveHeightPx,
    );
    setViewportSize({
      width: rect.width,
      height: rect.height,
    });
    setHeightPx((h) => Math.min(Math.max(h, inactiveHeightPx), nextMaxHeightPx));
  }, [inactiveHeightPx, viewportRef]);

  useLayoutEffect(() => {
    measureViewport();
    const target = viewportRef.current;
    if (!target || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureViewport());
    ro.observe(target);
    return () => ro.disconnect();
  }, [measureViewport, viewportRef]);

  useLayoutEffect(() => {
    if (!menuContentVisible) return;
    measureViewport();
  }, [menuContentVisible, measureViewport]);

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

  const cancelHeightAnimation = useCallback(() => {
    if (heightAnimFrameRef.current !== null) {
      cancelAnimationFrame(heightAnimFrameRef.current);
      heightAnimFrameRef.current = null;
    }
  }, []);

  const animateHeightTo = useCallback(
    (targetHeightPx: number) => {
      cancelHeightAnimation();
      measureViewport();
      const fromHeightPx = heightPxRef.current;
      if (fromHeightPx === targetHeightPx) return;

      const dragMaxHeightPx = resolveMaxHeightPx();
      const durationMs = SwipeMenuConsts.MOVE_ANIMATION_DURATION_MS;
      const startMs =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      const tick = (nowMs: number) => {
        const { heightPx: nextHeightPx, complete } = swipeMenuAnimatedHeightPx(
          fromHeightPx,
          targetHeightPx,
          nowMs - startMs,
          durationMs,
        );
        heightPxRef.current = nextHeightPx;
        setHeightPx(nextHeightPx);
        setBackdropOpacityImmediate(
          swipeMenuBackdropOpacity(
            nextHeightPx,
            inactiveHeightPx,
            dragMaxHeightPx,
          ),
        );
        if (complete) {
          heightAnimFrameRef.current = null;
        } else {
          heightAnimFrameRef.current = requestAnimationFrame(tick);
        }
      };

      heightAnimFrameRef.current = requestAnimationFrame(tick);
    },
    [
      cancelHeightAnimation,
      inactiveHeightPx,
      measureViewport,
      resolveMaxHeightPx,
      setBackdropOpacityImmediate,
    ],
  );

  useEffect(() => () => cancelHeightAnimation(), [cancelHeightAnimation]);

  useEffect(() => {
    return registerExpandHandler((request) => {
      if (request.pageId) {
        navigateToPage(request.pageId);
      }
      if (immersiveModeActive) return;
      const dragMaxHeightPx = resolveMaxHeightPx();
      const current = heightPxRef.current;
      const targetHeightPx = swipeMenuHeightAfterExpandRequest(
        current,
        inactiveHeightPx,
        dragMaxHeightPx,
      );
      if (targetHeightPx === current) return;
      animateHeightTo(targetHeightPx);
    });
  }, [
    animateHeightTo,
    immersiveModeActive,
    inactiveHeightPx,
    navigateToPage,
    registerExpandHandler,
    resolveMaxHeightPx,
  ]);

  const collapseIfOpenAboveCollapsedRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    collapseIfOpenAboveCollapsedRef.current = () => {
      const dragMaxHeightPx = resolveMaxHeightPx();
      const current = heightPxRef.current;
      const targetHeightPx = swipeMenuHeightAfterOutsideTap(
        current,
        inactiveHeightPx,
        dragMaxHeightPx,
      );
      if (targetHeightPx === current) return;
      animateHeightTo(targetHeightPx);
    };
  });

  useEffect(() => {
    if (!isOpenAboveCollapsed) return;
    const el = outsideDismissRef.current;
    if (!el) return;
    return subscribeOnTap(
      () => {
        suppressViewportClicksBriefly(SwipeMenuConsts.MOVE_ANIMATION_DURATION_MS);
        collapseIfOpenAboveCollapsedRef.current();
      },
      el,
      TAP_MAX_MOVEMENT_PX,
      true,
    );
  }, [isOpenAboveCollapsed]);

  useEffect(() => {
    onInteractionChange?.(
      swipeMenuViewportInteraction(
        immersiveModeActive,
        heightPx,
        inactiveHeightPx,
        menuBackdropOpacity,
      ),
    );
  }, [
    immersiveModeActive,
    menuBackdropOpacity,
    heightPx,
    inactiveHeightPx,
    onInteractionChange,
  ]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (immersiveModeActive) return;
    if (e.button !== 0) return;
    if (swipeMenuPointerTargetIsInteractive(e.target)) return;
    cancelHeightAnimation();
    measureViewport();
    openedMainMenuThisHandleDragRef.current = false;
    dragRef.current = {
      pointerId: e.pointerId,
      lastClientY: e.clientY,
      startClientY: e.clientY,
      startHeightPx: heightPxRef.current,
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
    const current = heightPxRef.current;
    const next = swipeMenuHeightAfterPointerDelta(
      current,
      deltaY,
      inactiveHeightPx,
      dragMaxHeightPx,
    );
    if (
      !openedMainMenuThisHandleDragRef.current &&
      swipeMenuShouldOpenMainMenuOnHandleDragMove(
        drag.startedOnHandle,
        drag.startHeightPx,
        next,
        inactiveHeightPx,
      )
    ) {
      openedMainMenuThisHandleDragRef.current = true;
      navigateToPage("mainMenu");
    }
    heightPxRef.current = next;
    setHeightPx(next);
    setBackdropOpacityImmediate(
      swipeMenuBackdropOpacity(next, inactiveHeightPx, dragMaxHeightPx),
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
    const current = heightPxRef.current;
    const afterHandleTap = swipeMenuHeightAfterHandlePointerUp(
      drag.startedOnHandle,
      pointerDeltaY,
      current,
      inactiveHeightPx,
      dragMaxHeightPx,
    );
    if (afterHandleTap !== current) {
      if (
        swipeMenuIsFullyExpanded(
          afterHandleTap,
          inactiveHeightPx,
          dragMaxHeightPx,
        )
      ) {
        navigateToPage("mainMenu");
      }
      animateHeightTo(afterHandleTap);
      return;
    }

    const target: SwipeMenuSnapTarget = swipeMenuSnapTarget(
      current,
      inactiveHeightPx,
      dragMaxHeightPx,
      SwipeMenuConsts.EXPAND_SNAP_THRESHOLD_RATIO,
    );
    if (target === "expanded") {
      navigateToPage("mainMenu");
    }
    const snapped = swipeMenuSnapHeightPx(
      target,
      inactiveHeightPx,
      dragMaxHeightPx,
    );
    heightPxRef.current = snapped;
    setHeightPx(snapped);
    setBackdropOpacityImmediate(
      swipeMenuBackdropOpacity(snapped, inactiveHeightPx, dragMaxHeightPx),
    );
  };

  const shellStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: menuHeightPx,
    minHeight: immersiveModeActive ? 0 : inactiveHeightPx,
    backgroundColor: SwipeMenuConsts.BG_COLOR,
    borderTopLeftRadius: SwipeMenuConsts.TOP_CORNER_RADIUS_PX,
    borderTopRightRadius: SwipeMenuConsts.TOP_CORNER_RADIUS_PX,
    boxSizing: "border-box",
    touchAction: "none",
    pointerEvents: immersiveModeActive ? "none" : "auto",
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
      {isOpenAboveCollapsed && !immersiveModeActive ? (
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
      {!immersiveModeActive ? (
        <div
          aria-hidden="true"
          style={handleStripStyle}
          {...{ [SWIPE_MENU_HANDLE_ATTR]: "" }}
        >
          <div style={pullIndicatorStyle} />
        </div>
      ) : null}
      {children != null ? (
        <SwipeMenuViewportContext.Provider
          value={{ widthPx: viewportSize.width, heightPx: viewportSize.height }}
        >
        <div
          aria-hidden={!menuContentVisible}
          style={{
            height: contentHeightPx,
            minHeight: menuContentVisible
              ? swipeMenuPageContentMinHeightPx(pageId, viewportSize.width)
              : 0,
            overflow: menuContentVisible ? "auto" : "hidden",
            visibility: menuContentVisible ? "visible" : "hidden",
            pointerEvents: menuContentVisible ? "auto" : "none",
            position: "relative",
            width: "100%",
            boxSizing: "border-box",
            flexShrink: 0,
          }}
        >
          {children}
        </div>
        </SwipeMenuViewportContext.Provider>
      ) : null}
    </div>
    </>
  );
}