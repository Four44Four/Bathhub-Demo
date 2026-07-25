/**
 * Dropshadow descriptor (see specifications/dropshadow.md).
 */
export type DropshadowDescriptor = {
  offsetX?: number;
  offsetY?: number;
  blurRadius?: number;
  spreadRadius?: number;
  color?: string;
};

export const DROPSHADOW_DEFAULT_OFFSET_X = 0;
export const DROPSHADOW_DEFAULT_OFFSET_Y = 0;
export const DROPSHADOW_DEFAULT_BLUR_RADIUS = 0;
export const DROPSHADOW_DEFAULT_SPREAD_RADIUS = 0;
export const DROPSHADOW_DEFAULT_COLOR = "rgba(0, 0, 0, 0.25)";

/** Swipe-up menu drop shadow (see specifications/swipe_up_menu/dropshadow_descriptor.md). */
export const SWIPE_MENU_DROP_SHADOW: DropshadowDescriptor = {
  offsetY: 2,
  blurRadius: 8,
  color: "rgba(18, 18, 47, 0.25)",
};

export function dropshadowToBoxShadowCss(descriptor: DropshadowDescriptor): string {
  const offsetX = descriptor.offsetX ?? DROPSHADOW_DEFAULT_OFFSET_X;
  const offsetY = descriptor.offsetY ?? DROPSHADOW_DEFAULT_OFFSET_Y;
  const blurRadius = descriptor.blurRadius ?? DROPSHADOW_DEFAULT_BLUR_RADIUS;
  const spreadRadius = descriptor.spreadRadius ?? DROPSHADOW_DEFAULT_SPREAD_RADIUS;
  const color = descriptor.color ?? DROPSHADOW_DEFAULT_COLOR;
  return `${offsetX}px ${offsetY}px ${blurRadius}px ${spreadRadius}px ${color}`;
}

/** Padding needed so a box-shadow is not clipped by overflow containers. */
export function dropshadowVisibleOverflowPaddingPx(
  descriptor: DropshadowDescriptor,
): number {
  const offsetX = Math.abs(descriptor.offsetX ?? DROPSHADOW_DEFAULT_OFFSET_X);
  const offsetY = Math.abs(descriptor.offsetY ?? DROPSHADOW_DEFAULT_OFFSET_Y);
  const blurRadius = descriptor.blurRadius ?? DROPSHADOW_DEFAULT_BLUR_RADIUS;
  const spreadRadius = descriptor.spreadRadius ?? DROPSHADOW_DEFAULT_SPREAD_RADIUS;
  return Math.ceil(Math.max(offsetX, offsetY) + blurRadius + spreadRadius);
}
