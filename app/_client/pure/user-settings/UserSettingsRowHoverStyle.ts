export function userSettingsRowHoverBrightnessFactor(
  isHovered: boolean,
  disabled: boolean,
  hoverBrightnessFactor: number,
): number {
  if (disabled || !isHovered) {
    return 1;
  }
  return hoverBrightnessFactor;
}

export function userSettingsRowHoverFilter(brightnessFactor: number): string {
  return `brightness(${brightnessFactor})`;
}

export function userSettingsRowHoverFilterTransition(
  transitionMs: number,
): string {
  return `filter ${transitionMs}ms ease`;
}

export function userSettingsRowHoverStyle(
  brightnessFactor: number,
  pageBg: string,
  transitionMs: number,
): {
  backgroundColor: string;
  filter: string;
  transition: string;
} {
  return {
    backgroundColor: pageBg,
    filter: userSettingsRowHoverFilter(brightnessFactor),
    transition: userSettingsRowHoverFilterTransition(transitionMs),
  };
}
