import { clamp } from "../../Utils";

export function numberSliderValueRatio(
  value: number,
  min: number,
  max: number,
): number {
  if (max <= min) {
    return 0;
  }
  return (clamp(value, min, max) - min) / (max - min);
}

/** Knob center offset from the left edge of the track (CSS px). */
export function numberSliderKnobCenterPx(
  ratio: number,
  trackWidthPx: number,
  knobSizePx: number,
): number {
  const travel = Math.max(0, trackWidthPx - knobSizePx);
  return knobSizePx / 2 + ratio * travel;
}

/** Accent fill width from the left track edge to the knob center (CSS px). */
export function numberSliderAccentFillWidthPx(knobCenterPx: number): number {
  return knobCenterPx;
}

/** Knob offset from the left edge of the track (CSS px). */
export function booleanToggleKnobOffsetPx(
  checked: boolean,
  trackWidthPx: number,
  knobSizePx: number,
  trackPaddingPx: number,
): number {
  const offOffset = trackPaddingPx;
  const onOffset = trackWidthPx - knobSizePx - trackPaddingPx;
  return checked ? onOffset : offOffset;
}
