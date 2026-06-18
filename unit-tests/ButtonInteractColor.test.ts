import {
  invertHexHslValue,
  invertSvgMarkupHexColors,
  multiplyHexColorBrightness,
  viewportButtonBrightnessInteractColors,
  viewportButtonInteractColors,
} from "../app/_client/pure/viewport2d/ButtonInteractColor";

describe("multiplyHexColorBrightness", () => {
  test("returns the same color when factor is 1", () => {
    expect(multiplyHexColorBrightness("#E06C89", 1)).toBe("#e06c89");
  });

  test("dims rgb channels by the factor", () => {
    expect(multiplyHexColorBrightness("#FFFFFF", 0.7)).toBe("#b3b3b3");
    expect(multiplyHexColorBrightness("#E06C89", 0.7)).toBe("#9d4c60");
  });
});

describe("viewportButtonBrightnessInteractColors", () => {
  test("returns base colors when not highlighted", () => {
    expect(
      viewportButtonBrightnessInteractColors(
        "#111111",
        "#222222",
        "#333333",
        false,
        0.7,
      ),
    ).toEqual({
      fillColor: "#111111",
      outlineColor: "#222222",
      textColor: "#333333",
    });
  });

  test("dims all colors when highlighted", () => {
    expect(
      viewportButtonBrightnessInteractColors(
        "#E06C89",
        "#E06C89",
        "#FFFFFF",
        true,
        0.7,
      ),
    ).toEqual({
      fillColor: "#9d4c60",
      outlineColor: "#9d4c60",
      textColor: "#b3b3b3",
    });
  });
});

describe("invertHexHslValue", () => {
  test("inverts black to white", () => {
    expect(invertHexHslValue("#000000")).toBe("#ffffff");
  });

  test("inverts white to black", () => {
    expect(invertHexHslValue("#FFFFFF")).toBe("#000000");
  });

  test("double inversion returns the original color", () => {
    const original = "#0E0F11";
    expect(invertHexHslValue(invertHexHslValue(original))).toBe(
      original.toLowerCase(),
    );
  });

  test("inverts lightness while preserving hue for a saturated color", () => {
    expect(invertHexHslValue("#800000")).toBe("#ff7f7f");
  });
});

describe("viewportButtonInteractColors", () => {
  test("returns base colors when not highlighted", () => {
    expect(
      viewportButtonInteractColors("#111111", "#222222", "#333333", false),
    ).toEqual({
      fillColor: "#111111",
      outlineColor: "#222222",
      textColor: "#333333",
    });
  });

  test("returns inverted colors when highlighted", () => {
    const result = viewportButtonInteractColors(
      "#000000",
      "#FFFFFF",
      "#808080",
      true,
    );
    expect(result).toEqual({
      fillColor: "#ffffff",
      outlineColor: "#000000",
      textColor: "#7f7f7f",
    });
  });
});

describe("invertSvgMarkupHexColors", () => {
  test("inverts hex fill and stroke attributes", () => {
    const svg = '<path fill="#E4E4FF" stroke="#000000" />';
    expect(invertSvgMarkupHexColors(svg)).toBe(
      '<path fill="#00001b" stroke="#ffffff" />',
    );
  });
});
