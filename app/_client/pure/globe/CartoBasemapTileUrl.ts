/** Raster light basemap tile template (CARTO Positron / light_all). */
export const CARTO_LIGHT_ALL_TILE_URL_TEMPLATE =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";

/**
 * Appends the CARTO basemaps `key` query param required to serve real tiles
 * instead of the "API KEY REQUIRED" watermark placeholder.
 */
export function cartoBasemapTileUrlWithApiKey(
  urlTemplate: string,
  apiKey: string,
): string {
  if (apiKey.length === 0) {
    return urlTemplate;
  }
  const separator = urlTemplate.includes("?") ? "&" : "?";
  return `${urlTemplate}${separator}key=${encodeURIComponent(apiKey)}`;
}

/** Authenticated CARTO light_all UrlTemplateImageryProvider URL. */
export function cartoLightAllBasemapTileUrl(apiKey: string): string {
  return cartoBasemapTileUrlWithApiKey(CARTO_LIGHT_ALL_TILE_URL_TEMPLATE, apiKey);
}
