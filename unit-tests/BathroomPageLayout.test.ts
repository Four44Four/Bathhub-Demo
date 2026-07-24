import {
  bathroomPageContentMinHeightPx,
  bathroomPageDraftRatingAfterSwipeMenuTransition,
  bathroomPageDropdownExpandedPanelHeightPx,
  bathroomPageDropdownLayout,
  bathroomPageDropdownToggleHeightPx,
  bathroomPageLoadingSpinnerCenterPx,
  swipeMenuJustCollapsed,
} from "../app/_client/pure/swipeup/BathroomPageLayout";

describe("swipeMenuJustCollapsed", () => {
  test("is true only when the menu transitions from open to collapsed", () => {
    expect(swipeMenuJustCollapsed(false, false)).toBe(false);
    expect(swipeMenuJustCollapsed(true, true)).toBe(false);
    expect(swipeMenuJustCollapsed(false, true)).toBe(false);
    expect(swipeMenuJustCollapsed(true, false)).toBe(true);
  });
});

describe("bathroomPageDraftRatingAfterSwipeMenuTransition", () => {
  test("clears the draft rating when the swipe-up menu collapses", () => {
    expect(bathroomPageDraftRatingAfterSwipeMenuTransition(true, false, 4)).toBe(
      0,
    );
  });

  test("keeps the draft rating while the menu stays open or closed", () => {
    expect(bathroomPageDraftRatingAfterSwipeMenuTransition(true, true, 3)).toBe(
      3,
    );
    expect(bathroomPageDraftRatingAfterSwipeMenuTransition(false, false, 3)).toBe(
      3,
    );
    expect(bathroomPageDraftRatingAfterSwipeMenuTransition(false, true, 3)).toBe(
      3,
    );
  });
});

describe("bathroomPageLoadingSpinnerCenterPx", () => {
  test("centers horizontally and vertically in fully expanded menu coordinates", () => {
    expect(bathroomPageLoadingSpinnerCenterPx(400, 800)).toEqual({
      x: 200,
      y: 340,
    });
  });
});

describe("bathroom page content layout", () => {
  test("derives dropdown and minimum content dimensions from spec constants", () => {
    expect(bathroomPageDropdownToggleHeightPx()).toBe(44);
    expect(bathroomPageDropdownExpandedPanelHeightPx()).toBe(182);
    expect(bathroomPageDropdownLayout(400)).toEqual({
      x: 210,
      widthPx: 180,
    });
    expect(bathroomPageContentMinHeightPx(400)).toBe(246);
  });
});
