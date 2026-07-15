import {
  classifyEndpointFailure,
} from "../pure/classifyEndpointFailure.ts";
import {
  buildOpenRouteServiceApiKeyProbeUrl,
  classifyOpenRouteServiceKeyProbeResponse,
  HEIGIT_API_BASE_URL,
} from "../pure/openRouteServiceApiKeyProbe.ts";
import {
  classifySupabaseKeyProbeResponse,
  formatSupabaseKeyProbeDetail,
  type SupabaseKeyProbeBody,
} from "../pure/classifySupabaseKeyProbeResponse.ts";
import { type EnvVarUsabilityIssue } from "../pure/EnvVarUsability.ts";
import {
  OPEN_ROUTE_SERVICE_API_KEY_ENV,
  REDIS_URL_ENV,
  SUPABASE_KEY_ENV,
  SUPABASE_URL_ENV,
} from "../pure/RequiredEnvVars.ts";
export const ENV_ENDPOINT_CHECK_TIMEOUT_MS = 5000;

export { HEIGIT_API_BASE_URL };

/** GoTrue endpoint used to verify a Supabase API key is accepted by the gateway. */
export const SUPABASE_KEY_PROBE_PATH = "/auth/v1/user" as const;

/** Lightweight health probe for Supabase reachability (no auth required). */
export const SUPABASE_HEALTH_PROBE_PATH = "/auth/v1/health" as const;

export type ServerEnvEndpointCheckers = {
  checkOpenRouteServiceApiKey: (
    apiKey: string,
  ) => Promise<EnvVarUsabilityIssue | null>;
  checkSupabaseEndpoint: (
    url: string,
    key: string,
  ) => Promise<EnvVarUsabilityIssue | null>;
  checkRedisEndpoint: (
    redisUrl: string,
  ) => Promise<EnvVarUsabilityIssue | null>;
};

function joinBaseUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function issueFromFailure(
  name: string,
  error: unknown,
  fallbackKind: EnvVarUsabilityIssue["kind"],
): EnvVarUsabilityIssue {
  const classified = classifyEndpointFailure(error);
  if (classified !== null) {
    return { name, kind: classified.kind, detail: classified.detail };
  }

  return {
    name,
    kind: fallbackKind,
    detail: error instanceof Error ? error.message : "unknown error",
  };
}

export async function checkOpenRouteServiceApiKey(
  apiKey: string,
  timeoutMs: number = ENV_ENDPOINT_CHECK_TIMEOUT_MS,
): Promise<EnvVarUsabilityIssue | null> {
  const url = buildOpenRouteServiceApiKeyProbeUrl();

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    const probeResult = classifyOpenRouteServiceKeyProbeResponse(
      response.status,
    );

    if (probeResult === "unauthenticated") {
      return {
        name: OPEN_ROUTE_SERVICE_API_KEY_ENV,
        kind: "unauthenticated",
        detail: `HTTP ${response.status}`,
      };
    }

    if (probeResult === "server_error") {
      return {
        name: OPEN_ROUTE_SERVICE_API_KEY_ENV,
        kind: "unreachable",
        detail: `HTTP ${response.status}`,
      };
    }

    return null;
  } catch (error) {
    return issueFromFailure(
      OPEN_ROUTE_SERVICE_API_KEY_ENV,
      error,
      "unreachable",
    );
  }
}

export async function checkSupabaseEndpoint(
  url: string,
  key: string,
  timeoutMs: number = ENV_ENDPOINT_CHECK_TIMEOUT_MS,
): Promise<EnvVarUsabilityIssue | null> {
  try {
    const healthResponse = await fetch(
      joinBaseUrl(url, SUPABASE_HEALTH_PROBE_PATH),
      {
        signal: AbortSignal.timeout(timeoutMs),
      },
    );

    if (healthResponse.status >= 500) {
      return {
        name: SUPABASE_URL_ENV,
        kind: "unreachable",
        detail: `HTTP ${healthResponse.status}`,
      };
    }
  } catch (error) {
    return issueFromFailure(SUPABASE_URL_ENV, error, "unreachable");
  }

  try {
    const response = await fetch(joinBaseUrl(url, SUPABASE_KEY_PROBE_PATH), {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    const body = (await response.json().catch(() => ({}))) as SupabaseKeyProbeBody;
    const probeResult = classifySupabaseKeyProbeResponse(response.status, body);

    if (probeResult === "unauthenticated") {
      return {
        name: SUPABASE_KEY_ENV,
        kind: "unauthenticated",
        detail: formatSupabaseKeyProbeDetail(body),
      };
    }

    if (probeResult === "server_error") {
      return {
        name: SUPABASE_URL_ENV,
        kind: "unreachable",
        detail: `HTTP ${response.status}`,
      };
    }

    return null;
  } catch (error) {
    return issueFromFailure(SUPABASE_URL_ENV, error, "unreachable");
  }
}

export async function checkRedisEndpoint(
  redisUrl: string,
  timeoutMs: number = ENV_ENDPOINT_CHECK_TIMEOUT_MS,
): Promise<EnvVarUsabilityIssue | null> {
  try {
    const { pingRedisUrl } = await import("./redisUrlPing.ts");
    await pingRedisUrl(redisUrl, timeoutMs);
    return null;
  } catch (error) {
    return issueFromFailure(REDIS_URL_ENV, error, "unreachable");
  }
}

export const defaultServerEnvEndpointCheckers: ServerEnvEndpointCheckers = {
  checkOpenRouteServiceApiKey: checkOpenRouteServiceApiKey,
  checkSupabaseEndpoint: checkSupabaseEndpoint,
  checkRedisEndpoint: checkRedisEndpoint,
};
