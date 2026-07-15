import { isHttpAuthFailureStatus } from "./classifyEndpointFailure.ts";
import {
  HEIGIT_API_BASE_URL,
  OPEN_ROUTE_SERVICE_GEOCODE_PROBE_PATH,
} from "./openRouteServiceApi.ts";

export { HEIGIT_API_BASE_URL, OPEN_ROUTE_SERVICE_GEOCODE_PROBE_PATH };

/** Minimal query for the geocode probe (single result, short text). */
export const OPEN_ROUTE_SERVICE_GEOCODE_PROBE_QUERY =
  "text=karlsruhe&size=1" as const;

export type OpenRouteServiceKeyProbeResult =
  | "ok"
  | "unauthenticated"
  | "server_error";

export function buildOpenRouteServiceApiKeyProbeUrl(
  baseUrl: string = HEIGIT_API_BASE_URL,
): string {
  return `${baseUrl.replace(/\/$/, "")}${OPEN_ROUTE_SERVICE_GEOCODE_PROBE_PATH}?${OPEN_ROUTE_SERVICE_GEOCODE_PROBE_QUERY}`;
}

export function classifyOpenRouteServiceKeyProbeResponse(
  status: number,
): OpenRouteServiceKeyProbeResult {
  if (isHttpAuthFailureStatus(status)) {
    return "unauthenticated";
  }

  if (status >= 500) {
    return "server_error";
  }

  return "ok";
}
