import { TestingBathroomPage as TestingBathroomPageConsts } from "../../ComponentConstants";
import { swipeUpMainMenuGridHeightPx } from "./MainMenuLayout";

export type SwipeMenuPageId = "mainMenu" | "testingBathroom";

export const SWIPE_MENU_DEFAULT_PAGE_ID: SwipeMenuPageId = "mainMenu";

/**
 * True when a pull-handle drag is opening the menu above its collapsed height
 * (used to switch to the main menu page during the drag, not on release).
 */
export function swipeMenuShouldOpenMainMenuOnHandleDragMove(
  startedOnHandle: boolean,
  dragStartHeightPx: number,
  nextHeightPx: number,
  inactiveHeightPx: number,
): boolean {
  return (
    startedOnHandle &&
    nextHeightPx > inactiveHeightPx &&
    nextHeightPx > dragStartHeightPx
  );
}

/** Minimum swipe-up menu content height for the testing bathroom page. */
export function testingBathroomPageContentMinHeightPx(
  fontSizePx: number = TestingBathroomPageConsts.TEXT_FONT_SIZE_PX,
  topOffsetPx: number = TestingBathroomPageConsts.TEXT_TOP_OFFSET_PX,
  lineHeightRatio: number = TestingBathroomPageConsts.TEXT_LINE_HEIGHT,
): number {
  return topOffsetPx + fontSizePx * lineHeightRatio;
}

/** Resolved minimum content height for the active swipe-up menu page. */
export function swipeMenuPageContentMinHeightPx(
  pageId: SwipeMenuPageId,
  viewportWidthPx: number,
): number {
  switch (pageId) {
    case "mainMenu":
      return swipeUpMainMenuGridHeightPx(viewportWidthPx);
    case "testingBathroom":
      return testingBathroomPageContentMinHeightPx();
    default: {
      const _exhaustive: never = pageId;
      return _exhaustive;
    }
  }
}
