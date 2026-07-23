/**
 * Aligns a second bottom-right-anchored control to the same center as a reference control.
 *
 * Both controls are assumed to use CSS `right` and `bottom` insets from their container.
 */
export function bottomRightAnchorInsetsForSharedCenter(
  referenceRightPx: number,
  referenceBottomPx: number,
  referenceOuterSidePx: number,
  targetOuterSidePx: number,
): { rightPx: number; bottomPx: number } {
  const halfSideDeltaPx = (referenceOuterSidePx - targetOuterSidePx) / 2;
  return {
    rightPx: referenceRightPx + halfSideDeltaPx,
    bottomPx: referenceBottomPx + halfSideDeltaPx,
  };
}
