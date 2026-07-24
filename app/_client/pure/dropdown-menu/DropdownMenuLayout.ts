/** Quadratic ease-in-out for dropdown panel expand/collapse (0–1). */
export function dropdownMenuQuadraticEase(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) {
    return 2 * clamped * clamped;
  }
  return 1 - Math.pow(-2 * clamped + 2, 2) / 2;
}

/** Arrow rotation in degrees: 0 = right, 90 = down. */
export function dropdownMenuArrowRotationDeg(expandedProgress: number): number {
  return dropdownMenuQuadraticEase(expandedProgress) * 90;
}

/** Interpolates panel height during expand/collapse animation. */
export function dropdownMenuPanelHeightPx(
  expandedProgress: number,
  fullHeightPx: number,
): number {
  return dropdownMenuQuadraticEase(expandedProgress) * fullHeightPx;
}

/** Right-half dropdown width in CSS pixels (minus side margins). */
export function bathroomPageDropdownWidthPx(
  menuWidthPx: number,
  sideMarginPx: number,
): number {
  return Math.max(0, menuWidthPx / 2 - sideMarginPx * 2);
}

/** X offset for a right-half dropdown anchored to the swipe-up menu. */
export function bathroomPageDropdownXPx(
  menuWidthPx: number,
  sideMarginPx: number,
): number {
  return menuWidthPx / 2 + sideMarginPx;
}
