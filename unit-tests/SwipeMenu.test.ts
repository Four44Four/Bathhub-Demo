import {
  swipeMenuMoveEasingProgress01,
  swipeMenuAnimatedHeightPx,
  swipeMenuBackdropOpacity,
  swipeMenuBackdropOpacityLerp,
  swipeMenuContentHeightPx,
  swipeMenuExpandProgress,
  swipeMenuExpandRangePx,
  swipeMenuHeightAfterHandlePointerUp,
  swipeMenuHeightAfterHandleToggle,
  swipeMenuHeightAfterOutsideTap,
  swipeMenuHeightAfterPointerDelta,
  swipeMenuIsExpandable,
  swipeMenuIsFullyExpanded,
  swipeMenuIsOpenAboveCollapsed,
  swipeMenuIsTapGesture,
  swipeMenuMaxHeightPx,
  multiplyCssRgbaAlpha,
  swipeMenuShadowAlphaAtProgress,
  swipeMenuShadowGradient,
  swipeMenuTopShadowTopPx,
  swipeMenuPullIndicatorWidthCss,
  swipeMenuPullIndicatorWidthPx,
  swipeMenuSnapHeightPx,
  swipeMenuSnapTarget,
  swipeMenuViewportInteraction,
} from "../app/_client/pure/swipeup/SwipeMenu";

describe("SwipeMenu", () => {
  const inactive = 20;
  const max = 400;
  const viewportHeight = 800;

  test("swipeMenuContentHeightPx", () => {
    expect(swipeMenuContentHeightPx(20, inactive)).toBe(0);
    expect(swipeMenuContentHeightPx(120, inactive)).toBe(100);
  });

  test("swipeMenuExpandProgress and backdrop opacity", () => {
    expect(swipeMenuExpandProgress(inactive, inactive, max)).toBe(0);
    expect(swipeMenuExpandProgress(max, inactive, max)).toBe(1);
    const mid = inactive + (max - inactive) * 0.5;
    expect(swipeMenuExpandProgress(mid, inactive, max)).toBeCloseTo(0.5, 5);
    expect(swipeMenuBackdropOpacity(mid, inactive, max)).toBeCloseTo(0.5, 5);
    expect(swipeMenuExpandProgress(inactive, inactive, inactive)).toBe(0);
  });

  test("swipeMenuBackdropOpacityLerp", () => {
    expect(swipeMenuBackdropOpacityLerp(0, 1, 0)).toBe(0);
    expect(swipeMenuBackdropOpacityLerp(0, 1, 1)).toBe(1);
    expect(swipeMenuBackdropOpacityLerp(0.2, 0.8, 0.5)).toBeCloseTo(0.5, 5);
    expect(swipeMenuBackdropOpacityLerp(0, 1, 2)).toBe(1);
  });

  test("swipeMenuPullIndicatorWidthCss", () => {
    expect(swipeMenuPullIndicatorWidthCss(0.18)).toBe("18%");
    expect(swipeMenuPullIndicatorWidthCss(0)).toBe("0%");
  });

  test("multiplyCssRgbaAlpha", () => {
    expect(multiplyCssRgbaAlpha("rgba(12, 13, 18, 0.62)", 0.5)).toBe(
      "rgba(12, 13, 18, 0.31)",
    );
    expect(multiplyCssRgbaAlpha("rgb(12, 13, 18)", 0.5)).toBe(
      "rgba(12, 13, 18, 0.5)",
    );
    expect(multiplyCssRgbaAlpha("rgba(12, 13, 18, 0.62)", 0)).toBe(
      "rgba(12, 13, 18, 0)",
    );
  });

  test("swipeMenuTopShadowTopPx", () => {
    expect(swipeMenuTopShadowTopPx(30, 12)).toBe(-18);
    expect(swipeMenuTopShadowTopPx(10, 12)).toBe(2);
    expect(swipeMenuTopShadowTopPx(30, 0)).toBe(-30);
  });

  test("swipeMenuShadowAlphaAtProgress", () => {
    expect(swipeMenuShadowAlphaAtProgress(0)).toBe(1);
    expect(swipeMenuShadowAlphaAtProgress(1)).toBe(0);
    expect(swipeMenuShadowAlphaAtProgress(0.5)).toBeCloseTo(0.25, 5);
    expect(swipeMenuShadowAlphaAtProgress(0.25)).toBeCloseTo(0.5625, 5);
  });

  test("swipeMenuShadowGradient", () => {
    const gradient = swipeMenuShadowGradient("rgba(12, 13, 18, 0.62)", 0.5, 4);
    expect(gradient.startsWith("linear-gradient(to top, ")).toBe(true);
    expect(gradient).toContain("rgba(12, 13, 18, 0.31) 0%");
    expect(gradient).toContain("rgba(12, 13, 18, 0) 100%");
    expect(gradient).toContain("rgba(12, 13, 18, 0.0775) 50%");
  });

  test("swipeMenuPullIndicatorWidthPx", () => {
    expect(swipeMenuPullIndicatorWidthPx(360, 0.18)).toBeCloseTo(64.8, 5);
    expect(swipeMenuPullIndicatorWidthPx(0, 0.18)).toBe(0);
    expect(swipeMenuPullIndicatorWidthPx(360, 0)).toBe(0);
  });

  test("swipeMenuMaxHeightPx", () => {
    expect(swipeMenuMaxHeightPx(800, 0.45, inactive)).toBe(360);
    expect(swipeMenuMaxHeightPx(800, 0, inactive)).toBe(inactive);
    expect(swipeMenuMaxHeightPx(0, 0.5, inactive)).toBe(inactive);
  });

  test("positive expand ratio always yields expandable range when viewport is known", () => {
    for (const ratio of [0.45, 0.25, 0.05, 0.01]) {
      const maxH = swipeMenuMaxHeightPx(viewportHeight, ratio, inactive);
      expect(swipeMenuIsExpandable(inactive, maxH)).toBe(true);
      expect(swipeMenuExpandRangePx(inactive, maxH)).toBeGreaterThan(0);
    }
  });

  test("small expand ratio still allows upward drag", () => {
    const maxH = swipeMenuMaxHeightPx(viewportHeight, 0.01, inactive);
    expect(
      swipeMenuHeightAfterPointerDelta(inactive, -40, inactive, maxH),
    ).toBeGreaterThan(inactive);
  });

  test("zero expand ratio disables expansion", () => {
    const maxH = swipeMenuMaxHeightPx(viewportHeight, 0, inactive);
    expect(swipeMenuIsExpandable(inactive, maxH)).toBe(false);
    expect(
      swipeMenuHeightAfterPointerDelta(inactive, -80, inactive, maxH),
    ).toBe(inactive);
  });

  test("changing expand ratio keeps menu draggable for positive ratios", () => {
    const ratios = [0.45, 0.3, 0.15, 0.08];
    for (const ratio of ratios) {
      const maxH = swipeMenuMaxHeightPx(viewportHeight, ratio, inactive);
      const range = swipeMenuExpandRangePx(inactive, maxH);
      const dragPastThreshold = -(range * 0.5 + 1);
      let height = inactive;
      height = swipeMenuHeightAfterPointerDelta(
        height,
        dragPastThreshold,
        inactive,
        maxH,
      );
      expect(height).toBeGreaterThan(inactive);
      const target = swipeMenuSnapTarget(
        height,
        inactive,
        maxH,
        0.35,
      );
      expect(target).toBe("expanded");
      height = swipeMenuSnapHeightPx(target, inactive, maxH);
      expect(height).toBe(maxH);
    }
  });

  test("unmeasured viewport then measured viewport becomes expandable", () => {
    const ratio = 0.45;
    const beforeMeasure = swipeMenuMaxHeightPx(0, ratio, inactive);
    expect(swipeMenuIsExpandable(inactive, beforeMeasure)).toBe(false);

    const afterMeasure = swipeMenuMaxHeightPx(viewportHeight, ratio, inactive);
    expect(swipeMenuIsExpandable(inactive, afterMeasure)).toBe(true);
    expect(
      swipeMenuHeightAfterPointerDelta(inactive, -50, inactive, afterMeasure),
    ).toBeGreaterThan(inactive);
  });

  test("swipeMenuHeightAfterPointerDelta increases height when dragging up", () => {
    expect(swipeMenuHeightAfterPointerDelta(20, -30, inactive, max)).toBe(50);
  });

  test("swipeMenuHeightAfterPointerDelta decreases height when dragging down", () => {
    expect(swipeMenuHeightAfterPointerDelta(100, 40, inactive, max)).toBe(60);
  });

  test("swipeMenuHeightAfterPointerDelta clamps to inactive and max", () => {
    expect(swipeMenuHeightAfterPointerDelta(20, 50, inactive, max)).toBe(inactive);
    expect(swipeMenuHeightAfterPointerDelta(390, -50, inactive, max)).toBe(max);
  });

  test("swipeMenuSnapTarget", () => {
    const threshold = 0.35;
    const mid = inactive + (max - inactive) * threshold;
    expect(swipeMenuSnapTarget(mid - 1, inactive, max, threshold)).toBe("collapsed");
    expect(swipeMenuSnapTarget(mid, inactive, max, threshold)).toBe("expanded");
    expect(swipeMenuSnapTarget(max, inactive, max, threshold)).toBe("expanded");
    expect(swipeMenuSnapTarget(inactive, inactive, max, threshold)).toBe("collapsed");
  });

  test("swipeMenuSnapHeightPx", () => {
    expect(swipeMenuSnapHeightPx("collapsed", inactive, max)).toBe(inactive);
    expect(swipeMenuSnapHeightPx("expanded", inactive, max)).toBe(max);
  });

  test("swipeMenuIsFullyExpanded", () => {
    expect(swipeMenuIsFullyExpanded(inactive, inactive, max)).toBe(false);
    expect(swipeMenuIsFullyExpanded(120, inactive, max)).toBe(false);
    expect(swipeMenuIsFullyExpanded(max, inactive, max)).toBe(true);
    expect(swipeMenuIsFullyExpanded(max + 10, inactive, max)).toBe(true);
    expect(swipeMenuIsFullyExpanded(max, inactive, inactive)).toBe(false);
  });

  test("swipeMenuHeightAfterHandleToggle", () => {
    expect(swipeMenuHeightAfterHandleToggle(inactive, inactive, max)).toBe(max);
    expect(swipeMenuHeightAfterHandleToggle(120, inactive, max)).toBe(max);
    expect(swipeMenuHeightAfterHandleToggle(max, inactive, max)).toBe(inactive);
    expect(swipeMenuHeightAfterHandleToggle(120, inactive, inactive)).toBe(120);
  });

  test("swipeMenuIsTapGesture", () => {
    expect(swipeMenuIsTapGesture(0)).toBe(true);
    expect(swipeMenuIsTapGesture(8)).toBe(true);
    expect(swipeMenuIsTapGesture(-8)).toBe(true);
    expect(swipeMenuIsTapGesture(9)).toBe(false);
    expect(swipeMenuIsTapGesture(-9)).toBe(false);
  });

  test("swipeMenuHeightAfterHandlePointerUp expands on handle tap when collapsed", () => {
    expect(
      swipeMenuHeightAfterHandlePointerUp(true, 0, inactive, inactive, max),
    ).toBe(max);
    expect(
      swipeMenuHeightAfterHandlePointerUp(true, 0, 120, inactive, max),
    ).toBe(max);
  });

  test("swipeMenuHeightAfterHandlePointerUp collapses on handle tap when expanded", () => {
    expect(
      swipeMenuHeightAfterHandlePointerUp(true, 0, max, inactive, max),
    ).toBe(inactive);
  });

  test("swipeMenuIsOpenAboveCollapsed", () => {
    expect(swipeMenuIsOpenAboveCollapsed(inactive, inactive)).toBe(false);
    expect(swipeMenuIsOpenAboveCollapsed(inactive + 1, inactive)).toBe(true);
    expect(swipeMenuIsOpenAboveCollapsed(max, inactive)).toBe(true);
  });

  test("swipeMenuHeightAfterOutsideTap collapses when open", () => {
    expect(swipeMenuHeightAfterOutsideTap(max, inactive, max)).toBe(inactive);
    expect(swipeMenuHeightAfterOutsideTap(120, inactive, max)).toBe(inactive);
    expect(swipeMenuHeightAfterOutsideTap(inactive, inactive, max)).toBe(
      inactive,
    );
  });

  test("swipeMenuMoveEasingProgress01 uses quadratic ease-in-out", () => {
    expect(swipeMenuMoveEasingProgress01(0)).toBe(0);
    expect(swipeMenuMoveEasingProgress01(0.25)).toBe(0.125);
    expect(swipeMenuMoveEasingProgress01(0.5)).toBe(0.5);
    expect(swipeMenuMoveEasingProgress01(0.75)).toBe(0.875);
    expect(swipeMenuMoveEasingProgress01(1)).toBe(1);
  });

  test("swipeMenuAnimatedHeightPx interpolates with quadratic easing", () => {
    expect(
      swipeMenuAnimatedHeightPx(100, 20, 0, 600),
    ).toEqual({ heightPx: 100, complete: false });
    expect(
      swipeMenuAnimatedHeightPx(100, 20, 150, 600),
    ).toEqual({ heightPx: 90, complete: false });
    expect(
      swipeMenuAnimatedHeightPx(100, 20, 300, 600),
    ).toEqual({ heightPx: 60, complete: false });
    expect(
      swipeMenuAnimatedHeightPx(100, 20, 600, 600),
    ).toEqual({ heightPx: 20, complete: true });
    expect(
      swipeMenuAnimatedHeightPx(100, 20, 900, 600),
    ).toEqual({ heightPx: 20, complete: true });
  });

  test("swipeMenuHeightAfterHandlePointerUp ignores drags and non-handle taps", () => {
    const partial = 120;
    expect(
      swipeMenuHeightAfterHandlePointerUp(true, 20, partial, inactive, max),
    ).toBe(partial);
    expect(
      swipeMenuHeightAfterHandlePointerUp(false, 0, inactive, inactive, max),
    ).toBe(inactive);
    expect(
      swipeMenuHeightAfterHandlePointerUp(
        true,
        0,
        inactive,
        inactive,
        inactive,
      ),
    ).toBe(inactive);
  });

  test("swipeMenuViewportInteraction clears overlay during add-bathroom mode", () => {
    expect(
      swipeMenuViewportInteraction(true, max, inactive, 1),
    ).toEqual({ blocksViewportPointer: false, backdropOpacity: 0, menuHeightPx: 0 });
    expect(
      swipeMenuViewportInteraction(false, max, inactive, 0.75),
    ).toEqual({ blocksViewportPointer: true, backdropOpacity: 0.75, menuHeightPx: max });
    expect(
      swipeMenuViewportInteraction(false, inactive, inactive, 0),
    ).toEqual({ blocksViewportPointer: false, backdropOpacity: 0, menuHeightPx: inactive });
  });
});
