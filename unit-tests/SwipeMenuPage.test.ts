import {
  testingBathroomPageContentMinHeightPx,
  swipeMenuPageContentMinHeightPx,
  swipeMenuShouldOpenMainMenuOnHandleDragMove,
} from "../app/_client/pure/swipeup/SwipeMenuPage";
import { swipeUpMainMenuGridHeightPx } from "../app/_client/pure/swipeup/MainMenuLayout";
import {
  showTestingBathroomMenuButtonLeftPx,
  showTestingBathroomMenuButtonTopPx,
} from "../app/_client/viewport2d/buttons/ShowTestingBathroomMenu";
import {
  showSwipeUpMenuButtonLeftPx,
  showSwipeUpMenuButtonOuterSidePx,
  showSwipeUpMenuButtonTopPx,
} from "../app/_client/viewport2d/buttons/ShowSwipeUpMenu";

describe("SwipeMenuPage", () => {
  const viewportWidthPx = 400;

  test("testingBathroomPageContentMinHeightPx includes top offset and text line height", () => {
    expect(testingBathroomPageContentMinHeightPx(30, 50, 1.2)).toBe(86);
  });

  test("swipeMenuPageContentMinHeightPx resolves per page", () => {
    expect(swipeMenuPageContentMinHeightPx("mainMenu", viewportWidthPx)).toBe(
      swipeUpMainMenuGridHeightPx(viewportWidthPx),
    );
    expect(swipeMenuPageContentMinHeightPx("testingBathroom", viewportWidthPx)).toBe(
      testingBathroomPageContentMinHeightPx(),
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
});

describe("ShowTestingBathroomMenu", () => {
  test("showTestingBathroomMenuButtonTopPx stacks below the hamburger button", () => {
    const topInsetPx = 16;
    const leftInsetPx = 16;
    const showSwipeUpMenuTop = showSwipeUpMenuButtonTopPx(topInsetPx);
    const showSwipeUpMenuOuterSide = showSwipeUpMenuButtonOuterSidePx();
    expect(
      showTestingBathroomMenuButtonTopPx(
        showSwipeUpMenuTop,
        showSwipeUpMenuOuterSide,
      ),
    ).toBe(showSwipeUpMenuTop + showSwipeUpMenuOuterSide);
    expect(showTestingBathroomMenuButtonLeftPx(leftInsetPx)).toBe(
      showSwipeUpMenuButtonLeftPx(leftInsetPx),
    );
  });
});
