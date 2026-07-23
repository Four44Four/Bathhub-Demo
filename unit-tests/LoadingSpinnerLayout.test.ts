import {
  loadingSpinnerCenteredPositionPx,
  loadingSpinnerElementSizePx,
} from "../app/_client/pure/viewport2d/LoadingSpinnerLayout";

describe("LoadingSpinnerLayout", () => {
  test("element size is twice the outer radius", () => {
    expect(loadingSpinnerElementSizePx(20)).toBe(40);
    expect(loadingSpinnerElementSizePx(9)).toBe(18);
  });

  test("centered position offsets top-left by the radius", () => {
    expect(loadingSpinnerCenteredPositionPx(100, 200, 20)).toEqual({
      left: 80,
      top: 180,
    });
  });
});
