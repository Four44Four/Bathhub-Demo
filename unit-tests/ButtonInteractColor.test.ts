import {
  invertHexHslValue,
  invertSvgMarkupHexColors,
  viewportButtonInteractColors,
} from "../app/_client/pure/viewport2d/ButtonInteractColor";

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
