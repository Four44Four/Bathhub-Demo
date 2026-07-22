import {
  VIEWPORT2D_BUTTON_TEXT_FONT_SIZE_PX,
  VIEWPORT2D_BUTTON_TEXT_LINE_HEIGHT,
  viewport2dButtonCircularContentSizePx,
  viewport2dButtonTextHeightPx,
  viewportCircularButtonOuterSidePx,
} from "../app/_client/pure/viewport2d/ButtonLayout";

describe("viewport2dButtonTextHeightPx", () => {
  test("uses the button font metrics", () => {
    expect(viewport2dButtonTextHeightPx()).toBe(
      VIEWPORT2D_BUTTON_TEXT_FONT_SIZE_PX * VIEWPORT2D_BUTTON_TEXT_LINE_HEIGHT,
    );
  });
});

describe("viewport2dButtonCircularContentSizePx", () => {
  test("uses the larger of image and text heights", () => {
    expect(viewport2dButtonCircularContentSizePx(true, 40, false)).toBe(40);
    expect(viewport2dButtonCircularContentSizePx(false, 40, true, 16.8)).toBe(
      16.8,
    );
    expect(viewport2dButtonCircularContentSizePx(true, 24, true, 16.8)).toBe(
      24,
    );
    expect(viewport2dButtonCircularContentSizePx(true, 10, true, 16.8)).toBe(
      16.8,
    );
  });

  test("returns 0 when there is no content", () => {
    expect(viewport2dButtonCircularContentSizePx(false, 24, false)).toBe(0);
  });
});

describe("viewportCircularButtonOuterSidePx", () => {
  test("adds symmetric padding and outline for border-box sizing", () => {
    expect(viewportCircularButtonOuterSidePx(40, 5, 1)).toBe(52);
    expect(viewportCircularButtonOuterSidePx(35, 10, 1)).toBe(57);
  });
});
