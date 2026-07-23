import {
  resolveSwipeUpMainMenuButtonMinHeightPx,
  resolveSwipeUpMainMenuButtonWidthPx,
  swipeUpMainMenuButtonHeightPx,
  swipeUpMainMenuButtonImageSizePx,
  swipeUpMainMenuButtonMaxContentHeightPx,
  swipeUpMainMenuButtonPositionPx,
  swipeUpMainMenuButtonTextLineCount,
  swipeUpMainMenuGridColumnWidthPx,
  swipeUpMainMenuGridContentWidthPx,
  swipeUpMainMenuGridHeightPx,
  swipeUpMainMenuGridWidthPx,
  swipeUpMainMenuRowHeightPx,
  SWIPE_UP_MAIN_MENU_DEFAULT_ROW_ITEMS,
} from "../app/_client/pure/swipeup/MainMenuLayout";
import { SwipeUpMainMenuButton } from "../app/_client/ComponentConstants";

describe("MainMenuLayout", () => {
  const viewportWidthPx = 400;
  const columnWidthPx = 89;

  test("swipeUpMainMenuGridContentWidthPx subtracts side margins", () => {
    expect(swipeUpMainMenuGridContentWidthPx(viewportWidthPx)).toBe(380);
    expect(swipeUpMainMenuGridContentWidthPx(0)).toBe(0);
  });

  test("swipeUpMainMenuGridColumnWidthPx divides content width across four columns", () => {
    expect(swipeUpMainMenuGridColumnWidthPx(viewportWidthPx)).toBe(columnWidthPx);
  });

  test("resolveSwipeUpMainMenuButtonWidthPx maps 100% to a grid column", () => {
    expect(
      resolveSwipeUpMainMenuButtonWidthPx(
        SwipeUpMainMenuButton.FULL_GRID_CELL_WIDTH,
        viewportWidthPx,
      ),
    ).toBe(columnWidthPx);
  });

  test("resolveSwipeUpMainMenuButtonMinHeightPx maps 100% to row height", () => {
    expect(
      resolveSwipeUpMainMenuButtonMinHeightPx(
        SwipeUpMainMenuButton.FULL_GRID_ROW_MIN_HEIGHT,
        96,
      ),
    ).toBe(96);
    expect(
      resolveSwipeUpMainMenuButtonMinHeightPx(
        SwipeUpMainMenuButton.DEFAULT_MIN_HEIGHT,
        96,
      ),
    ).toBe(0);
  });

  test("swipeUpMainMenuButtonImageSizePx is half the button width", () => {
    expect(swipeUpMainMenuButtonImageSizePx(columnWidthPx)).toBe(44.5);
  });

  test("swipeUpMainMenuButtonTextLineCount wraps long labels at word boundaries", () => {
    expect(
      swipeUpMainMenuButtonTextLineCount("Edit user settings", columnWidthPx),
    ).toBe(2);
    expect(swipeUpMainMenuButtonTextLineCount("Add bathroom", columnWidthPx)).toBe(
      2,
    );
    expect(swipeUpMainMenuButtonTextLineCount("Edit user settings", 100)).toBe(2);
  });

  test("swipeUpMainMenuButtonMaxContentHeightPx includes vertical padding", () => {
    expect(
      swipeUpMainMenuButtonMaxContentHeightPx(columnWidthPx, "Add bathroom"),
    ).toBe(98.5);
    expect(
      swipeUpMainMenuButtonMaxContentHeightPx(
        columnWidthPx,
        "Edit user settings",
      ),
    ).toBe(98.5);
  });

  test("swipeUpMainMenuRowHeightPx uses the tallest button content in the row", () => {
    const rowHeightPx = swipeUpMainMenuRowHeightPx(
      viewportWidthPx,
      SWIPE_UP_MAIN_MENU_DEFAULT_ROW_ITEMS,
    );
    const editSettingsHeightPx = swipeUpMainMenuButtonMaxContentHeightPx(
      columnWidthPx,
      "Edit user settings",
    );
    const addBathroomHeightPx = swipeUpMainMenuButtonMaxContentHeightPx(
      columnWidthPx,
      "Add bathroom",
    );

    expect(editSettingsHeightPx).toBe(addBathroomHeightPx);
    expect(rowHeightPx).toBe(editSettingsHeightPx);
  });

  test("swipeUpMainMenuButtonHeightPx stretches shorter buttons to the row height", () => {
    const rowHeightPx = swipeUpMainMenuRowHeightPx(
      viewportWidthPx,
      SWIPE_UP_MAIN_MENU_DEFAULT_ROW_ITEMS,
    );

    expect(
      swipeUpMainMenuButtonHeightPx(
        columnWidthPx,
        "Add bathroom",
        SwipeUpMainMenuButton.FULL_GRID_ROW_MIN_HEIGHT,
        rowHeightPx,
      ),
    ).toBe(rowHeightPx);
  });

  test("swipeUpMainMenuGridWidthPx spans the full viewport", () => {
    expect(swipeUpMainMenuGridWidthPx(viewportWidthPx)).toBe(400);
  });

  test("swipeUpMainMenuGridHeightPx includes top and bottom margins", () => {
    const rowHeightPx = swipeUpMainMenuRowHeightPx(
      viewportWidthPx,
      SWIPE_UP_MAIN_MENU_DEFAULT_ROW_ITEMS,
    );
    expect(swipeUpMainMenuGridHeightPx(viewportWidthPx)).toBe(
      8 + rowHeightPx + 12,
    );
  });

  test("swipeUpMainMenuButtonPositionPx places items left to right with side margin", () => {
    expect(swipeUpMainMenuButtonPositionPx(0, viewportWidthPx)).toEqual({
      x: 10,
      y: 8,
    });
    expect(swipeUpMainMenuButtonPositionPx(1, viewportWidthPx)).toEqual({
      x: 107,
      y: 8,
    });
  });
});
