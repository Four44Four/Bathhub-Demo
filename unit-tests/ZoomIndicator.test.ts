import {
    zoomIndicatorOpacityTransitionCss,
    zoomIndicatorSquareTopLeftCss,
} from "../app/_client/pure/viewport2d/ZoomIndicator";

describe("zoomIndicatorMath", () => {
    test("zoomIndicatorSquareTopLeftCss", () => {
      expect(zoomIndicatorSquareTopLeftCss(100, 200, 18)).toEqual({ left: 91, top: 191 });
    });
  
    test("zoomIndicatorOpacityTransitionCss", () => {
      expect(zoomIndicatorOpacityTransitionCss("in", 150, 500)).toContain("150ms");
      expect(zoomIndicatorOpacityTransitionCss("out", 150, 500)).toContain("500ms");
    });
});