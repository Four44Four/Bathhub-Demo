const BLACK_COLOR_VALUE = String.raw`(?:#(?:000000|000)|black)`;

const BLACK_FILL_PATTERN = new RegExp(
  String.raw`fill\s*=\s*(["'])${BLACK_COLOR_VALUE}\1`,
  "gi",
);

const BLACK_STROKE_PATTERN = new RegExp(
  String.raw`stroke\s*=\s*(["'])${BLACK_COLOR_VALUE}\1`,
  "gi",
);

/** Replaces black SVG `fill` / `stroke` attributes with `targetColor`. */
export function recolorBlackSvgMarkup(
  svgMarkup: string,
  targetColor: string,
): string {
  return svgMarkup
    .replace(BLACK_FILL_PATTERN, `fill="${targetColor}"`)
    .replace(BLACK_STROKE_PATTERN, `stroke="${targetColor}"`);
}

/** Builds a same-origin data URL for an SVG recolored from black to `targetColor`. */
export function recoloredBlackSvgDataUrl(
  svgMarkup: string,
  targetColor: string,
): string {
  return `data:image/svg+xml,${encodeURIComponent(
    recolorBlackSvgMarkup(svgMarkup, targetColor),
  )}`;
}
