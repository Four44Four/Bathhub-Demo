import {
  bathroomPageDraftRatingAfterSwipeMenuTransition,
  bathroomPageLoadingSpinnerCenterPx,
  swipeMenuJustReopenedAboveCollapsed,
} from "../app/_client/pure/swipeup/BathroomPageLayout";

describe("swipeMenuJustReopenedAboveCollapsed", () => {
  test("is true only when the menu transitions from collapsed to open", () => {
    expect(swipeMenuJustReopenedAboveCollapsed(false, false)).toBe(false);
    expect(swipeMenuJustReopenedAboveCollapsed(true, true)).toBe(false);
    expect(swipeMenuJustReopenedAboveCollapsed(true, false)).toBe(false);
    expect(swipeMenuJustReopenedAboveCollapsed(false, true)).toBe(true);
  });
});

describe("bathroomPageDraftRatingAfterSwipeMenuTransition", () => {
  test("clears the draft rating when the swipe-up menu reopens", () => {
    expect(bathroomPageDraftRatingAfterSwipeMenuTransition(false, true, 4)).toBe(
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
    expect(bathroomPageDraftRatingAfterSwipeMenuTransition(true, false, 3)).toBe(
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
