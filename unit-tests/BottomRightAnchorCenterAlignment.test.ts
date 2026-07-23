import { bottomRightAnchorInsetsForSharedCenter } from "../app/_client/pure/viewport2d/BottomRightAnchorCenterAlignment";

describe("bottomRightAnchorInsetsForSharedCenter", () => {
  it("returns the same insets when both controls share the same outer size", () => {
    expect(
      bottomRightAnchorInsetsForSharedCenter(16, 35, 57, 57),
    ).toEqual({
      rightPx: 16,
      bottomPx: 35,
    });
  });

  it("offsets a smaller target outward so centers align with the reference", () => {
    expect(
      bottomRightAnchorInsetsForSharedCenter(16, 35, 57, 48),
    ).toEqual({
      rightPx: 20.5,
      bottomPx: 39.5,
    });
  });

  it("offsets a larger target inward so centers align with the reference", () => {
    expect(
      bottomRightAnchorInsetsForSharedCenter(16, 35, 48, 57),
    ).toEqual({
      rightPx: 11.5,
      bottomPx: 30.5,
    });
  });
});
