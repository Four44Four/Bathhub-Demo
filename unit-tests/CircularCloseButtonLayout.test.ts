import { circularCloseButtonFontSizePx } from "../app/_client/pure/CircularCloseButtonLayout";

describe("circularCloseButtonFontSizePx", () => {
  it("returns the reference font size at the default diameter", () => {
    expect(circularCloseButtonFontSizePx(44)).toBe(22);
  });

  it("scales the font size proportionally to the button diameter", () => {
    expect(circularCloseButtonFontSizePx(57)).toBe(29);
  });
});
