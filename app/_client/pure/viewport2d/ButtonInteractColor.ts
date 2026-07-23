import { clamp01, hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from "../../Utils";
import { lerpHex } from "../HexColor";

export type Viewport2dButtonHoverInteractBehavior = "invert" | "darken";

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

/** HSL lightness (0–1), the brightness channel with hue and saturation held fixed. */
export function hexHslBrightness(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b).l;
}

/** Returns `hex` with only its HSL brightness/lightness replaced. */
export function hexWithHslBrightness(hex: string, brightness: number): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s } = rgbToHsl(r, g, b);
  const out = hslToRgb(h, s, clamp01(brightness));
  return rgbToHex(out.r, out.g, out.b);
}

/** Inverts brightness (HSL lightness) while preserving hue and saturation. */
export function invertHexBrightness(hex: string): string {
  return lerpHexBrightnessInvert(hex, 1);
}

/**
 * Linearly interpolates only the brightness channel toward its inverted value.
 * `t` = 0 returns the original; `t` = 1 returns the fully brightness-inverted color.
 */
export function lerpHexBrightnessInvert(hex: string, t: number): string {
  const brightness = hexHslBrightness(hex);
  const u = clamp01(t);
  const nextBrightness = brightness * (1 - u) + (1 - brightness) * u;
  return hexWithHslBrightness(hex, nextBrightness);
}

export function viewportButtonInteractColorsAtProgress(
  fillColor: string,
  outlineColor: string,
  textColor: string,
  invertProgress: number,
): { fillColor: string; outlineColor: string; textColor: string } {
  const t = clamp01(invertProgress);
  if (t <= 0) {
    return { fillColor, outlineColor, textColor };
  }
  return {
    fillColor: lerpHexBrightnessInvert(fillColor, t),
    outlineColor: lerpHexBrightnessInvert(outlineColor, t),
    textColor: lerpHexBrightnessInvert(textColor, t),
  };
}

/**
 * Linearly interpolates fill, outline, and text colors toward their RGB-brightness-multiplied values.
 * `t` = 0 returns the originals; `t` = 1 returns colors multiplied by `darkenFactor`.
 */
export function viewportButtonDarkenInteractColorsAtProgress(
  fillColor: string,
  outlineColor: string,
  textColor: string,
  progress: number,
  darkenFactor: number,
): { fillColor: string; outlineColor: string; textColor: string } {
  const t = clamp01(progress);
  if (t <= 0) {
    return { fillColor, outlineColor, textColor };
  }
  return {
    fillColor: lerpHex(
      fillColor,
      multiplyHexColorBrightness(fillColor, darkenFactor),
      t,
    ),
    outlineColor: lerpHex(
      outlineColor,
      multiplyHexColorBrightness(outlineColor, darkenFactor),
      t,
    ),
    textColor: lerpHex(
      textColor,
      multiplyHexColorBrightness(textColor, darkenFactor),
      t,
    ),
  };
}

export function viewportButtonInteractColorsForBehavior(
  fillColor: string,
  outlineColor: string,
  textColor: string,
  progress: number,
  behavior: Viewport2dButtonHoverInteractBehavior,
  darkenFactor: number,
): { fillColor: string; outlineColor: string; textColor: string } {
  if (behavior === "darken") {
    return viewportButtonDarkenInteractColorsAtProgress(
      fillColor,
      outlineColor,
      textColor,
      progress,
      darkenFactor,
    );
  }
  return viewportButtonInteractColorsAtProgress(
    fillColor,
    outlineColor,
    textColor,
    progress,
  );
}

export function viewportButtonInteractColors(
  fillColor: string,
  outlineColor: string,
  textColor: string,
  isHighlighted: boolean,
): { fillColor: string; outlineColor: string; textColor: string } {
  return viewportButtonInteractColorsAtProgress(
    fillColor,
    outlineColor,
    textColor,
    isHighlighted ? 1 : 0,
  );
}

const SVG_HEX_ATTR_PATTERN =
  /(fill|stroke)\s*=\s*(["'])(#[0-9A-Fa-f]{3,8})\2/gi;

/** Replaces hex `fill` / `stroke` colors with brightness-inverted colors. */
export function invertSvgMarkupHexBrightness(svgMarkup: string): string {
  return svgMarkup.replace(SVG_HEX_ATTR_PATTERN, (_match, attr, quote, hex) =>
    `${attr}=${quote}${invertHexBrightness(hex)}${quote}`,
  );
}

export function svgMarkupToDataUrl(svgMarkup: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svgMarkup)}`;
}
