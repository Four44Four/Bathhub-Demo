import {
  swipeMenuPageContentMinHeightPx,
  swipeMenuShouldOpenMainMenuOnHandleDragMove,
  swipeMenuShouldOpenMainMenuOnSnapToExpanded,
} from "../app/_client/pure/swipeup/SwipeMenuPage";

describe("SwipeMenuPage", () => {
  const viewportWidthPx = 400;

  test("swipeMenuPageContentMinHeightPx resolves spec-derived page heights", () => {
    expect(swipeMenuPageContentMinHeightPx("mainMenu", viewportWidthPx)).toBe(
      118.5,
    );
    expect(swipeMenuPageContentMinHeightPx("bathroom", viewportWidthPx)).toBe(
      246,
    );
  });

  test("swipeMenuShouldOpenMainMenuOnHandleDragMove opens when handle drag expands", () => {
    const inactive = 20;
    expect(
      swipeMenuShouldOpenMainMenuOnHandleDragMove(true, inactive, 40, inactive),
    ).toBe(true);
    expect(
      swipeMenuShouldOpenMainMenuOnHandleDragMove(true, inactive, inactive, inactive),
    ).toBe(false);
    expect(
      swipeMenuShouldOpenMainMenuOnHandleDragMove(false, inactive, 40, inactive),
    ).toBe(false);
    expect(
      swipeMenuShouldOpenMainMenuOnHandleDragMove(true, 200, 120, inactive),
    ).toBe(false);
  });

  test("swipeMenuShouldOpenMainMenuOnSnapToExpanded opens only when snapping up from below max", () => {
    const inactive = 20;
    const max = 400;
    expect(
      swipeMenuShouldOpenMainMenuOnSnapToExpanded(
        inactive,
        "expanded",
        inactive,
        max,
      ),
    ).toBe(true);
    expect(
      swipeMenuShouldOpenMainMenuOnSnapToExpanded(max, "expanded", inactive, max),
    ).toBe(false);
    expect(
      swipeMenuShouldOpenMainMenuOnSnapToExpanded(
        200,
        "collapsed",
        inactive,
        max,
      ),
    ).toBe(false);
  });
});
