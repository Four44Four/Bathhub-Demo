import {
  clamp01,
  hexToRgb,
  lerp,
  lerpHex,
  rgbToHex,
} from "../app/_client/pure/HexColor";

describe("HexColor", () => {
  test("parses long and shorthand hex colors", () => {
    expect(hexToRgb("#E4E4FF")).toEqual({ r: 228, g: 228, b: 255 });
    expect(hexToRgb("#0af")).toEqual({ r: 0, g: 170, b: 255 });
  });

  test("formats rounded RGB channels and clamps them to byte bounds", () => {
    expect(rgbToHex(228, 228, 255)).toBe("#e4e4ff");
    expect(rgbToHex(-1, 127.6, 300)).toBe("#0080ff");
  });

  test("clamps interpolation progress and interpolates color channels", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(lerpHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(lerpHex("#000000", "#ffffff", -1)).toBe("#000000");
    expect(lerpHex("#000000", "#ffffff", 2)).toBe("#ffffff");
  });
});
