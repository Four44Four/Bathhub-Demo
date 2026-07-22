import {
  showSwipeUpMenuButtonLeftPx,
  showSwipeUpMenuButtonOuterSidePx,
  showSwipeUpMenuButtonTopPx,
} from "../app/_client/viewport2d/buttons/ShowSwipeUpMenu";
import { Viewport2dButton as Viewport2dButtonConsts } from "../app/_client/ComponentConstants";

describe("ShowSwipeUpMenu", () => {
  test("showSwipeUpMenuButtonTopPx clamps negative insets", () => {
    expect(showSwipeUpMenuButtonTopPx(16)).toBe(16);
    expect(showSwipeUpMenuButtonTopPx(-4)).toBe(0);
  });

  test("showSwipeUpMenuButtonLeftPx clamps negative insets", () => {
    expect(showSwipeUpMenuButtonLeftPx(16)).toBe(16);
    expect(showSwipeUpMenuButtonLeftPx(-4)).toBe(0);
  });

  test("showSwipeUpMenuButtonOuterSidePx sizes image plus padding and outline", () => {
    const imageSize = Viewport2dButtonConsts.IMAGE_SIZE;
    const padding = 8;
    const outline = Viewport2dButtonConsts.OUTLINE_THICKNESS;
    expect(showSwipeUpMenuButtonOuterSidePx(imageSize, padding, outline)).toBe(
      imageSize + 2 * padding + 2 * outline,
    );
  });
});
