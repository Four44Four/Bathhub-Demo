import {
  swipeMenuContentHeightPx,
  swipeMenuExpandRangePx,
  swipeMenuHeightAfterPointerDelta,
  swipeMenuIsExpandable,
  swipeMenuMaxHeightPx,
  swipeMenuPullIndicatorWidthCss,
  swipeMenuPullIndicatorWidthPx,
  swipeMenuSnapHeightPx,
  swipeMenuSnapTarget,
} from "../app/_client/pure/SwipeMenu";

describe("SwipeMenu", () => {
  const inactive = 20;
  const max = 400;
  const viewportHeight = 800;

  test("swipeMenuContentHeightPx", () => {
    expect(swipeMenuContentHeightPx(20, inactive)).toBe(0);
    expect(swipeMenuContentHeightPx(120, inactive)).toBe(100);
  });

  test("swipeMenuPullIndicatorWidthCss", () => {
    expect(swipeMenuPullIndicatorWidthCss(0.18)).toBe("18%");
    expect(swipeMenuPullIndicatorWidthCss(0)).toBe("0%");
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
});
