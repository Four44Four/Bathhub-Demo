import * as Utils from "../../Utils";

/** Heuristic: classify “blue-ish” map-tile pixels as water (see GlobeViewport). */
export function classifyMapPixelAsWater(r: number, g: number, b: number): boolean {
  const maxRG = Math.max(r, g);
  const blueDominance = b - maxRG;
  return b > 60 && blueDominance > 20 && b > 1.05 * g;
}

export type Hsl = { h: number; s: number; l: number };

export function twoToneWaterOutputHsl(
  srcLightness: number,
  waterPalette: Hsl,
): Hsl {
  const l = Utils.clamp01(0.25 + srcLightness * 0.35);
  const s = Utils.clamp01(waterPalette.s * 0.9);
  return { h: waterPalette.h, s, l };
}

export function twoToneLandOutputHsl(src: Hsl, landPalette: Hsl): Hsl {
  const l = Utils.clamp01(0.18 + src.l * 0.7);
  const s = Utils.clamp01(Math.max(landPalette.s, src.s * 0.35));
  return { h: landPalette.h, s, l };
}
