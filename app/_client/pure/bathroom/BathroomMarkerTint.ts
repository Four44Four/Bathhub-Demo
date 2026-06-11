import { BathroomMapMarker } from "../../ComponentConstants";
import { hexToRgb, rgbToHex } from "../../Utils";

const NOT_FROM_CACHE_DARKEN_FACTOR = 0.5;

export type BathroomMarkerBillboardTint = {
  color: string;
  opacity: number;
};

export function darkenCssHexColor(colorCss: string, factor: number): string {
  const { r, g, b } = hexToRgb(colorCss);
  return rgbToHex(r * factor, g * factor, b * factor);
}

export function bathroomMarkerBillboardTint(
  loadedFromCache: boolean,
  options: {
    baseColor?: string;
    baseOpacity?: number;
    debugCacheLoadedMarker?: boolean;
    notFromCacheDarkenFactor?: number;
  } = {},
): BathroomMarkerBillboardTint {
  const baseColor = options.baseColor ?? BathroomMapMarker.COLOR;
  const baseOpacity = options.baseOpacity ?? BathroomMapMarker.OPACITY;
  const debugCacheLoadedMarker =
    options.debugCacheLoadedMarker ?? BathroomMapMarker.DEBUG_CACH_LOADED_MARKER;
  const notFromCacheDarkenFactor =
    options.notFromCacheDarkenFactor ?? NOT_FROM_CACHE_DARKEN_FACTOR;

  if (!debugCacheLoadedMarker || loadedFromCache) {
    return { color: baseColor, opacity: baseOpacity };
  }

  return {
    color: darkenCssHexColor(baseColor, notFromCacheDarkenFactor),
    opacity: baseOpacity,
  };
}
