import { CircularCloseButton } from "../ComponentConstants";

/** Scales the × glyph to match a non-default circular close button diameter. */
export function circularCloseButtonFontSizePx(
  sizePx: number,
  referenceSizePx: number = CircularCloseButton.SIZE_PX,
  referenceFontSizePx: number = CircularCloseButton.FONT_SIZE_PX,
): number {
  return Math.round(sizePx * (referenceFontSizePx / referenceSizePx));
}
