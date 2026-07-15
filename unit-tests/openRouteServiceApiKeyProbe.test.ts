import {
  buildOpenRouteServiceApiKeyProbeUrl,
  classifyOpenRouteServiceKeyProbeResponse,
  HEIGIT_API_BASE_URL,
  OPEN_ROUTE_SERVICE_GEOCODE_PROBE_PATH,
} from "../app/_server/pure/openRouteServiceApiKeyProbe";
import { OPEN_ROUTE_SERVICE_API_HOST } from "../app/_server/pure/openRouteServiceApi";

describe("openRouteServiceApiKeyProbe", () => {
  test("buildOpenRouteServiceApiKeyProbeUrl targets the HeiGIT pelias search endpoint", () => {
    expect(buildOpenRouteServiceApiKeyProbeUrl()).toBe(
      `${HEIGIT_API_BASE_URL}${OPEN_ROUTE_SERVICE_GEOCODE_PROBE_PATH}?text=karlsruhe&size=1`,
    );
  });

  test("OPEN_ROUTE_SERVICE_API_HOST targets the HeiGIT openrouteservice prefix", () => {
    expect(OPEN_ROUTE_SERVICE_API_HOST).toBe(
      "https://api.heigit.org/openrouteservice",
    );
  });

  test("classifyOpenRouteServiceKeyProbeResponse treats auth failures as unauthenticated", () => {
    expect(classifyOpenRouteServiceKeyProbeResponse(401)).toBe(
      "unauthenticated",
    );
    expect(classifyOpenRouteServiceKeyProbeResponse(403)).toBe(
      "unauthenticated",
    );
  });

  test("classifyOpenRouteServiceKeyProbeResponse treats 5xx as server errors", () => {
    expect(classifyOpenRouteServiceKeyProbeResponse(502)).toBe("server_error");
    expect(classifyOpenRouteServiceKeyProbeResponse(503)).toBe("server_error");
  });

  test("classifyOpenRouteServiceKeyProbeResponse accepts successful responses", () => {
    expect(classifyOpenRouteServiceKeyProbeResponse(200)).toBe("ok");
    expect(classifyOpenRouteServiceKeyProbeResponse(429)).toBe("ok");
  });
});
