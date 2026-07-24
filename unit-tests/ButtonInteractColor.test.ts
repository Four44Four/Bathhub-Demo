import {
  hexHslBrightness,
  hexWithHslBrightness,
  invertHexBrightness,
  invertSvgMarkupHexBrightness,
  lerpHexBrightnessInvert,
  multiplyHexColorBrightness,
  svgMarkupToDataUrl,
  viewportButtonBrightnessInteractColors,
  viewportButtonDarkenInteractColorsAtProgress,
  viewportButtonInteractColors,
  viewportButtonInteractColorsAtProgress,
  viewportButtonInteractColorsForBehavior,
  viewportButtonInteractContentCssFilter,
} from "../app/_client/pure/viewport2d/ButtonInteractColor";

describe("svgMarkupToDataUrl", () => {
  test("encodes SVG markup as an image data URL", () => {
    const markup = '<svg><path fill="#000000" /></svg>';
    const url = svgMarkupToDataUrl(markup);

    expect(url.startsWith("data:image/svg+xml,")).toBe(true);
    expect(decodeURIComponent(url.slice("data:image/svg+xml,".length))).toBe(
      markup,
    );
  });
});

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

describe("hexHslBrightness", () => {
  test("returns HSL lightness for a color", () => {
    expect(hexHslBrightness("#000000")).toBe(0);
    expect(hexHslBrightness("#FFFFFF")).toBe(1);
    expect(hexHslBrightness("#808080")).toBeCloseTo(0.5, 1);
  });
});

describe("hexWithHslBrightness", () => {
  test("preserves hue and saturation while changing brightness", () => {
    expect(hexWithHslBrightness("#800000", 0.5)).toBe("#ff0000");
  });
});

describe("invertHexBrightness", () => {
  test("inverts black to white", () => {
    expect(invertHexBrightness("#000000")).toBe("#ffffff");
  });

  test("inverts white to black", () => {
    expect(invertHexBrightness("#FFFFFF")).toBe("#000000");
  });

  test("double inversion returns the original color", () => {
    const original = "#0E0F11";
    expect(invertHexBrightness(invertHexBrightness(original))).toBe(
      original.toLowerCase(),
    );
  });

  test("inverts brightness while preserving hue for a saturated color", () => {
    expect(invertHexBrightness("#800000")).toBe("#ff7f7f");
  });
});

describe("lerpHexBrightnessInvert", () => {
  test("returns the original color at t=0", () => {
    expect(lerpHexBrightnessInvert("#0E0F11", 0)).toBe("#0e0f11");
  });

  test("returns the brightness-inverted color at t=1", () => {
    expect(lerpHexBrightnessInvert("#0E0F11", 1)).toBe(
      invertHexBrightness("#0E0F11"),
    );
  });

  test("midpoint only shifts brightness for a saturated hue", () => {
    expect(lerpHexBrightnessInvert("#800000", 0.5)).toBe("#ff0000");
  });
});

describe("viewportButtonDarkenInteractColorsAtProgress", () => {
  test("returns base colors at progress 0", () => {
    expect(
      viewportButtonDarkenInteractColorsAtProgress(
        "#111111",
        "#222222",
        "#333333",
        0,
        0.7,
      ),
    ).toEqual({
      fillColor: "#111111",
      outlineColor: "#222222",
      textColor: "#333333",
    });
  });

  test("returns fully darkened colors at progress 1", () => {
    expect(
      viewportButtonDarkenInteractColorsAtProgress(
        "#FFFFFF",
        "#E06C89",
        "#000000",
        1,
        0.7,
      ),
    ).toEqual({
      fillColor: "#b3b3b3",
      outlineColor: "#9d4c60",
      textColor: "#000000",
    });
  });
});

describe("viewportButtonInteractColorsForBehavior", () => {
  test("uses invert behavior by default path", () => {
    expect(
      viewportButtonInteractColorsForBehavior(
        "#000000",
        "#FFFFFF",
        "#808080",
        1,
        "invert",
        0.7,
      ),
    ).toEqual(
      viewportButtonInteractColors("#000000", "#FFFFFF", "#808080", true),
    );
  });

  test("uses darken behavior when requested", () => {
    expect(
      viewportButtonInteractColorsForBehavior(
        "#FFFFFF",
        "#FFFFFF",
        "#FFFFFF",
        1,
        "darken",
        0.7,
      ),
    ).toEqual(
      viewportButtonDarkenInteractColorsAtProgress(
        "#FFFFFF",
        "#FFFFFF",
        "#FFFFFF",
        1,
        0.7,
      ),
    );
  });
});

describe("viewportButtonInteractColorsAtProgress", () => {
  test("returns base colors at progress 0", () => {
    expect(
      viewportButtonInteractColorsAtProgress(
        "#111111",
        "#222222",
        "#333333",
        0,
      ),
    ).toEqual({
      fillColor: "#111111",
      outlineColor: "#222222",
      textColor: "#333333",
    });
  });

  test("returns fully brightness-inverted colors at progress 1", () => {
    expect(
      viewportButtonInteractColorsAtProgress(
        "#000000",
        "#FFFFFF",
        "#808080",
        1,
      ),
    ).toEqual(
      viewportButtonInteractColors("#000000", "#FFFFFF", "#808080", true),
    );
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

  test("returns brightness-inverted colors when highlighted", () => {
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

describe("viewportButtonInteractContentCssFilter", () => {
  test("returns undefined at progress 0", () => {
    expect(
      viewportButtonInteractContentCssFilter(0, "darken", 0.7),
    ).toBeUndefined();
  });

  test("returns brightness filter for darken behavior", () => {
    expect(
      viewportButtonInteractContentCssFilter(1, "darken", 0.7),
    ).toBe("brightness(0.7)");
    expect(
      viewportButtonInteractContentCssFilter(0.5, "darken", 0.7),
    ).toBe("brightness(0.85)");
  });

  test("returns undefined for invert behavior", () => {
    expect(
      viewportButtonInteractContentCssFilter(1, "invert", 0.7),
    ).toBeUndefined();
  });
});

describe("invertSvgMarkupHexBrightness", () => {
  test("brightness-inverts hex fill and stroke attributes", () => {
    const svg = '<path fill="#E4E4FF" stroke="#000000" />';
    expect(invertSvgMarkupHexBrightness(svg)).toBe(
      '<path fill="#00001b" stroke="#ffffff" />',
    );
  });
});
