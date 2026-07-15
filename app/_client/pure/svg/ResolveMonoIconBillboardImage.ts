import { recolorBlackSvgMarkup, recoloredBlackSvgDataUrl } from "./RecolorBlackSvg";

export type MonoIconBillboardMode = "baked" | "tint";

const WHITE_BILLBOARD_TINT = "#FFFFFF";

/** Fetches a black mono-color SVG and returns a billboard-ready data URL. */
export async function resolveMonoIconBillboardImage(
  imagePath: string,
  mode: MonoIconBillboardMode,
  color: string,
): Promise<string> {
  if (!imagePath.endsWith(".svg")) {
    return imagePath;
  }

  const response = await fetch(imagePath);
  const markup = await response.text();
  const bakedColor = mode === "baked" ? color : WHITE_BILLBOARD_TINT;
  return recoloredBlackSvgDataUrl(recolorBlackSvgMarkup(markup, bakedColor));
}

/** Billboard tint to pair with a baked mono-color SVG texture. */
export function monoIconBakedBillboardTint(opacity: number): {
  color: string;
  opacity: number;
} {
  return { color: WHITE_BILLBOARD_TINT, opacity };
}

/** Billboard tint to pair with a white-base mono-color SVG texture. */
export function monoIconTintBillboardTint(
  color: string,
  opacity: number,
): { color: string; opacity: number } {
  return { color, opacity };
}
