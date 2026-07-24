import {
  swipeMenuPageContentMinHeightPx,
  swipeMenuShouldOpenMainMenuOnHandleDragMove,
  swipeMenuShouldOpenMainMenuOnSnapToExpanded,
} from "../app/_client/pure/swipeup/SwipeMenuPage";
import { bathroomPageContentMinHeightPx } from "../app/_client/pure/swipeup/BathroomPageLayout";
import { swipeUpMainMenuGridHeightPx } from "../app/_client/pure/swipeup/MainMenuLayout";

describe("SwipeMenuPage", () => {
  const viewportWidthPx = 400;

  test("swipeMenuPageContentMinHeightPx resolves per page", () => {
    expect(swipeMenuPageContentMinHeightPx("mainMenu", viewportWidthPx)).toBe(
      swipeUpMainMenuGridHeightPx(viewportWidthPx),
    );
    expect(swipeMenuPageContentMinHeightPx("bathroom", viewportWidthPx)).toBe(
      bathroomPageContentMinHeightPx(viewportWidthPx),
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
