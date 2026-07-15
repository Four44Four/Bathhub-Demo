/** Public HeiGIT API origin (replaces deprecated `api.openrouteservice.org`). */
export const HEIGIT_API_BASE_URL = "https://api.heigit.org" as const;

/** `host` option for openrouteservice-js routing clients. */
export const OPEN_ROUTE_SERVICE_API_HOST =
  `${HEIGIT_API_BASE_URL}/openrouteservice` as const;

/** Pelias geocode search path on {@link HEIGIT_API_BASE_URL}. */
export const OPEN_ROUTE_SERVICE_GEOCODE_PROBE_PATH =
  "/pelias/v1/search" as const;
