import {
  DROPSHADOW_DEFAULT_COLOR,
  dropshadowToBoxShadowCss,
  SWIPE_MENU_DROP_SHADOW,
} from "../app/_client/pure/Dropshadow";

describe("dropshadowToBoxShadowCss", () => {
  test("uses specification defaults for omitted properties", () => {
    expect(dropshadowToBoxShadowCss({})).toBe(
      `0px 0px 0px 0px ${DROPSHADOW_DEFAULT_COLOR}`,
    );
  });

  test("formats swipe-menu drop shadow descriptor", () => {
    expect(dropshadowToBoxShadowCss(SWIPE_MENU_DROP_SHADOW)).toBe(
      "0px 2px 8px 0px rgba(18, 18, 47, 0.25)",
    );
  });

  test("formats explicit offsets, radii, and color", () => {
    expect(
      dropshadowToBoxShadowCss({
        offsetX: 4,
        offsetY: 6,
        blurRadius: 10,
        spreadRadius: 2,
        color: "rgba(1, 2, 3, 0.5)",
      }),
    ).toBe("4px 6px 10px 2px rgba(1, 2, 3, 0.5)");
  });
});
