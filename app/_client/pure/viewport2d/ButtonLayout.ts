/**
 * Viewport2d button layout helpers (see specifications/components/viewport2d_button.md).
 *
 * Circular outer size uses content + 2×padding + 2×outline (border-box), matching prior
 * circular button sizing. A literal reading of “radius = max(content height) + padding”
 * would yield diameter `2 × (maxHeight + padding)` and break existing control sizes.
 */

export const VIEWPORT2D_BUTTON_TEXT_FONT_SIZE_PX = 14;
export const VIEWPORT2D_BUTTON_TEXT_LINE_HEIGHT = 1.2;

export function viewport2dButtonTextHeightPx(
  fontSizePx: number = VIEWPORT2D_BUTTON_TEXT_FONT_SIZE_PX,
  lineHeight: number = VIEWPORT2D_BUTTON_TEXT_LINE_HEIGHT,
): number {
  return fontSizePx * lineHeight;
}

/** Max content height used to size a circular viewport2d button. */
export function viewport2dButtonCircularContentSizePx(
  hasImage: boolean,
  imageSizePx: number,
  hasText: boolean,
  textHeightPx: number = viewport2dButtonTextHeightPx(),
): number {
  const imageHeight = hasImage ? imageSizePx : 0;
  const textHeight = hasText ? textHeightPx : 0;
  return Math.max(imageHeight, textHeight);
}

/** Outer width/height of a circular viewport2d button (`border-box`, symmetric padding). */
export function viewportCircularButtonOuterSidePx(
  contentSizePx: number,
  paddingPx: number,
  outlineThicknessPx: number,
): number {
  return contentSizePx + 2 * paddingPx + 2 * outlineThicknessPx;
}
