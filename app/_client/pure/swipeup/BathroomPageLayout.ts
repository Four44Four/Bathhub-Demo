import {
  BathroomPage as BathroomPageConsts,
  DropdownMenu as DropdownMenuConsts,
  SwipeMenu as SwipeMenuConsts,
  SwipeUpMainMenu as SwipeUpMainMenuConsts,
} from "../../ComponentConstants";
import {
  bathroomPageDropdownWidthPx,
  bathroomPageDropdownXPx,
} from "../dropdown-menu/DropdownMenuLayout";
import { swipeMenuMaxHeightPx } from "./SwipeMenu";

/** One-line toggle row height for the ratings dropdown. */
export function bathroomPageDropdownToggleHeightPx(): number {
  return (
    DropdownMenuConsts.PADDING_PIXEL_SIZE * 2 +
    DropdownMenuConsts.ARROW_ICON_PIXEL_SIZE
  );
}

/** Estimated expanded dropdown panel height for min swipe-up menu sizing. */
export function bathroomPageDropdownExpandedPanelHeightPx(): number {
  const ratingBarsHeight =
    5 * BathroomPageConsts.RATING_BAR_HEIGHT_PX +
    4 * BathroomPageConsts.RATING_BAR_GAP_PX;
  const postButtonHeight =
    DropdownMenuConsts.PADDING_PIXEL_SIZE * 2 + 20;
  const starRowHeight = BathroomPageConsts.STAR_ICON_SIZE_PX;
  return (
    DropdownMenuConsts.PADDING_PIXEL_SIZE * 2 +
    ratingBarsHeight +
    BathroomPageConsts.RATINGS_PANEL_BUFFER_HEIGHT_PX +
    starRowHeight +
    DropdownMenuConsts.PADDING_PIXEL_SIZE +
    postButtonHeight
  );
}

/** Minimum swipe-up menu content height for the bathroom page. */
export function bathroomPageContentMinHeightPx(
  menuWidthPx: number,
): number {
  const toggleHeight = bathroomPageDropdownToggleHeightPx();
  const panelHeight = bathroomPageDropdownExpandedPanelHeightPx();
  return (
    BathroomPageConsts.DROPDOWN_TOP_OFFSET_PX +
    toggleHeight +
    panelHeight +
    SwipeUpMainMenuConsts.MARGIN_BOTTOM_PX
  );
}

export function bathroomPageDropdownLayout(menuWidthPx: number): {
  x: number;
  widthPx: number;
} {
  const sideMarginPx = SwipeUpMainMenuConsts.MARGIN_SIDE_PX;
  return {
    x: bathroomPageDropdownXPx(menuWidthPx, sideMarginPx),
    widthPx: bathroomPageDropdownWidthPx(menuWidthPx, sideMarginPx),
  };
}

/**
 * True when the swipe-up menu just transitioned from collapsed to open
 * (see specifications/swipe_up_menu/bathroom_page.md).
 */
export function swipeMenuJustReopenedAboveCollapsed(
  previousMenuWasOpenAboveCollapsed: boolean,
  currentMenuIsOpenAboveCollapsed: boolean,
): boolean {
  return !previousMenuWasOpenAboveCollapsed && currentMenuIsOpenAboveCollapsed;
}

/** Draft star rating after a swipe-up menu open/close transition. */
export function bathroomPageDraftRatingAfterSwipeMenuTransition(
  previousMenuWasOpenAboveCollapsed: boolean,
  currentMenuIsOpenAboveCollapsed: boolean,
  currentDraftRating: number,
): number {
  if (
    swipeMenuJustReopenedAboveCollapsed(
      previousMenuWasOpenAboveCollapsed,
      currentMenuIsOpenAboveCollapsed,
    )
  ) {
    return 0;
  }
  return currentDraftRating;
}

/** Center point for the bathroom page loading spinner in content-anchor coordinates. */
export function bathroomPageLoadingSpinnerCenterPx(
  menuWidthPx: number,
  phoneViewportHeightPx: number,
): { x: number; y: number } {
  const inactiveHeightPx = SwipeMenuConsts.INACTIVE_HEIGHT_PX;
  const expandedHeightPx = swipeMenuMaxHeightPx(
    phoneViewportHeightPx,
    SwipeMenuConsts.MAX_EXPAND_RATIO,
    inactiveHeightPx,
  );

  return {
    x: menuWidthPx / 2,
    y: expandedHeightPx / 2 - inactiveHeightPx,
  };
}
