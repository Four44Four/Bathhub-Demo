import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from "../../Utils";

/** Multiplies RGB channels, matching CSS `filter: brightness(factor)`. */
export function multiplyHexColorBrightness(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

export function viewportButtonBrightnessInteractColors(
  fillColor: string,
  outlineColor: string,
  textColor: string,
  isHighlighted: boolean,
  brightnessFactorMult: number,
): { fillColor: string; outlineColor: string; textColor: string } {
  if (!isHighlighted) {
    return { fillColor, outlineColor, textColor };
  }
  return {
    fillColor: multiplyHexColorBrightness(fillColor, brightnessFactorMult),
    outlineColor: multiplyHexColorBrightness(outlineColor, brightnessFactorMult),
    textColor: multiplyHexColorBrightness(textColor, brightnessFactorMult),
  };
}

/** Inverts HSL lightness while preserving hue and saturation. */
export function invertHexHslValue(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const out = hslToRgb(h, s, 1 - l);
  return rgbToHex(out.r, out.g, out.b);
}

export function viewportButtonInteractColors(
  fillColor: string,
  outlineColor: string,
  textColor: string,
  isHighlighted: boolean,
): { fillColor: string; outlineColor: string; textColor: string } {
  if (!isHighlighted) {
    return { fillColor, outlineColor, textColor };
  }
  return {
    fillColor: invertHexHslValue(fillColor),
    outlineColor: invertHexHslValue(outlineColor),
    textColor: invertHexHslValue(textColor),
  };
}

const SVG_HEX_ATTR_PATTERN =
  /(fill|stroke)\s*=\s*(["'])(#[0-9A-Fa-f]{3,8})\2/gi;

/** Replaces hex `fill` / `stroke` colors in SVG markup with HSL-value-inverted colors. */
export function invertSvgMarkupHexColors(svgMarkup: string): string {
  return svgMarkup.replace(SVG_HEX_ATTR_PATTERN, (_match, attr, quote, hex) =>
    `${attr}=${quote}${invertHexHslValue(hex)}${quote}`,
  );
}

export function svgMarkupToDataUrl(svgMarkup: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svgMarkup)}`;
}
