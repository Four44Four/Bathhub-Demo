import { bathroomPageContentMinHeightPx } from "./BathroomPageLayout";
import { swipeUpMainMenuGridHeightPx } from "./MainMenuLayout";
import {
  swipeMenuIsFullyExpanded,
  type SwipeMenuSnapTarget,
} from "./SwipeMenu";

export type SwipeMenuPageId = "mainMenu" | "bathroom";

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

/**
 * True when a drag release snaps the menu into expanded mode from below fully
 * expanded (avoids re-opening the main menu on taps while already expanded).
 */
export function swipeMenuShouldOpenMainMenuOnSnapToExpanded(
  gestureStartHeightPx: number,
  snapTarget: SwipeMenuSnapTarget,
  inactiveHeightPx: number,
  maxHeightPx: number,
): boolean {
  return (
    snapTarget === "expanded" &&
    !swipeMenuIsFullyExpanded(
      gestureStartHeightPx,
      inactiveHeightPx,
      maxHeightPx,
    )
  );
}

/** Resolved minimum content height for the active swipe-up menu page. */
export function swipeMenuPageContentMinHeightPx(
  pageId: SwipeMenuPageId,
  viewportWidthPx: number,
): number {
  switch (pageId) {
    case "mainMenu":
      return swipeUpMainMenuGridHeightPx(viewportWidthPx);
    case "bathroom":
      return bathroomPageContentMinHeightPx(viewportWidthPx);
    default: {
      const _exhaustive: never = pageId;
      return _exhaustive;
    }
  }
}
