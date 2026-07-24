import {
  positionalAlertMaxAncestorZIndex,
  VIEWPORT2D_TOP_LAYER_Z_INDEX,
  type CssComputedStyleReader,
} from "./PositionalAlertAnchor";

/** Renders the button one step above its anchor element's stacking tier. */
export const VIEWPORT2D_BUTTON_ABOVE_ANCHOR_Z_OFFSET = 1;

export function viewport2dButtonZIndex(
  anchorElement: HTMLElement | null,
  getComputedStyle: CssComputedStyleReader,
): number {
  if (anchorElement == null) {
    return VIEWPORT2D_TOP_LAYER_Z_INDEX;
  }
  return (
    positionalAlertMaxAncestorZIndex(anchorElement, getComputedStyle) +
    VIEWPORT2D_BUTTON_ABOVE_ANCHOR_Z_OFFSET
  );
}
