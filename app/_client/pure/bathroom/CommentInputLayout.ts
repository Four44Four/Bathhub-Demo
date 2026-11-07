/** Line box height used to size the rating comment field. */
export function commentInputFontHeightPx(
  fontSizePx: number,
  lineHeight: number,
): number {
  return fontSizePx * lineHeight;
}

/**
 * Comment field height grows with the text from 2× to 5× the font height,
 * then the field scrolls.
 */
export function commentInputHeightPx(input: {
  contentScrollHeightPx: number;
  fontHeightPx: number;
  minMultiplier: number;
  maxMultiplier: number;
}): { heightPx: number; scrollable: boolean } {
  const minHeightPx = input.fontHeightPx * input.minMultiplier;
  const maxHeightPx = input.fontHeightPx * input.maxMultiplier;
  const heightPx = Math.min(
    maxHeightPx,
    Math.max(minHeightPx, input.contentScrollHeightPx),
  );
  return {
    heightPx,
    scrollable: input.contentScrollHeightPx > maxHeightPx,
  };
}

/** Scroll offset that keeps the caret inside the visible comment field. */
export function commentInputScrollTopPx(input: {
  caretTopPx: number;
  clientHeightPx: number;
  scrollTopPx: number;
}): number {
  if (input.clientHeightPx <= 0) {
    return input.scrollTopPx;
  }
  const visibleBottomPx = input.scrollTopPx + input.clientHeightPx;
  if (input.caretTopPx < input.scrollTopPx) {
    return input.caretTopPx;
  }
  if (input.caretTopPx > visibleBottomPx) {
    return input.caretTopPx - input.clientHeightPx;
  }
  return input.scrollTopPx;
}
