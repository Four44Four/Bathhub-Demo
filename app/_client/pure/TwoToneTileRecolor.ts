import type { Hsl } from "../Utils";
import * as Utils from "../Utils";
import {
  classifyMapPixelAsWater,
  twoToneLandOutputHsl,
  twoToneWaterOutputHsl,
} from "./TwoToneMapTile";

export type TwoTonePalette = {
  waterHsl: Hsl;
  landHsl: Hsl;
};

export function twoTonePaletteFromRgb(
  water: { r: number; g: number; b: number },
  land: { r: number; g: number; b: number },
): TwoTonePalette {
  return {
    waterHsl: Utils.rgbToHsl(water.r, water.g, water.b),
    landHsl: Utils.rgbToHsl(land.r, land.g, land.b),
  };
}

/** Recolor RGBA rows `[rowStart, rowEnd)` in place (256×256 tile ≈ 65k pixels). */
export function recolorRgbaInPlace(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  palette: TwoTonePalette,
  rowStart = 0,
  rowEnd = height,
): void {
  const { waterHsl, landHsl } = palette;
  const rowBytes = width * 4;
  const y0 = Math.max(0, rowStart);
  const y1 = Math.min(height, rowEnd);

  for (let y = y0; y < y1; y++) {
    let i = y * rowBytes;
    const rowEndIndex = i + rowBytes;
    for (; i < rowEndIndex; i += 4) {
      const r = data[i + 0];
      const g = data[i + 1];
      const b = data[i + 2];
      const isWater = classifyMapPixelAsWater(r, g, b);
      const srcHsl = Utils.rgbToHsl(r, g, b);

      if (isWater) {
        const hsl = twoToneWaterOutputHsl(srcHsl.l, waterHsl);
        const out = Utils.hslToRgb(hsl.h, hsl.s, hsl.l);
        data[i + 0] = out.r;
        data[i + 1] = out.g;
        data[i + 2] = out.b;
      } else {
        const hsl = twoToneLandOutputHsl(srcHsl, landHsl);
        const out = Utils.hslToRgb(hsl.h, hsl.s, hsl.l);
        data[i + 0] = out.r;
        data[i + 1] = out.g;
        data[i + 2] = out.b;
      }

      data[i + 3] = 255;
    }
  }
}
