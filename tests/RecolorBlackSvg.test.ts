import {
  recolorBlackSvgMarkup,
  recoloredBlackSvgDataUrl,
} from "../app/_client/pure/svg/RecolorBlackSvg";

describe("recolorBlackSvgMarkup", () => {
  test("replaces fill=black", () => {
    const svg = '<path fill="black" stroke="none" />';
    expect(recolorBlackSvgMarkup(svg, "#E06C89")).toBe(
      '<path fill="#E06C89" stroke="none" />',
    );
  });

  test("replaces fill=#000000", () => {
    const svg = '<path fill="#000000" />';
    expect(recolorBlackSvgMarkup(svg, "#6CE0D1")).toBe(
      '<path fill="#6CE0D1" />',
    );
  });

  test("replaces fill=#000 and stroke=black", () => {
    const svg = '<path fill="#000" stroke="black" />';
    expect(recolorBlackSvgMarkup(svg, "#123456")).toBe(
      '<path fill="#123456" stroke="#123456" />',
    );
  });
});

describe("recoloredBlackSvgDataUrl", () => {
  test("returns encoded data URL", () => {
    const url = recoloredBlackSvgDataUrl('<svg fill="black"></svg>', "#ABCDEF");
    expect(url.startsWith("data:image/svg+xml,")).toBe(true);
    expect(decodeURIComponent(url.slice("data:image/svg+xml,".length))).toBe(
      '<svg fill="#ABCDEF"></svg>',
    );
  });
});
