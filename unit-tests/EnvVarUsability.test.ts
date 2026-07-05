import { classifyEndpointFailure, isHttpAuthFailureStatus } from "../app/_server/pure/classifyEndpointFailure";
import {
  formatEnvVarUsabilityIssueLine,
  formatEnvVarUsabilityIssuesMessage,
  issuesFromMissingEnvVarNames,
} from "../app/_server/pure/EnvVarUsability";
import { REDIS_URL_ENV, SUPABASE_KEY_ENV } from "../app/_server/pure/RequiredEnvVars";
import { collectServerEnvUsabilityIssues } from "../app/_server/bootstrap/validateServerEnv";
import { type ServerEnvEndpointCheckers } from "../app/_server/bootstrap/serverEnvEndpointCheckers";

describe("EnvVarUsability", () => {
  test("issuesFromMissingEnvVarNames marks each name as missing", () => {
    expect(issuesFromMissingEnvVarNames([SUPABASE_KEY_ENV])).toEqual([
      { name: SUPABASE_KEY_ENV, kind: "missing" },
    ]);
  });

  test("formatEnvVarUsabilityIssuesMessage includes kind and detail", () => {
    expect(
      formatEnvVarUsabilityIssuesMessage([
        { name: REDIS_URL_ENV, kind: "unreachable", detail: "econnrefused" },
        { name: SUPABASE_KEY_ENV, kind: "unauthenticated", detail: "HTTP 401" },
      ]),
    ).toBe(
      "Missing or non-usable environment variables:\n  - REDIS_URL: unreachable (econnrefused)\n  - SUPABASE_KEY: unauthenticated (HTTP 401)",
    );
  });

  test("formatEnvVarUsabilityIssueLine formats missing entries", () => {
    expect(
      formatEnvVarUsabilityIssueLine({
        name: SUPABASE_KEY_ENV,
        kind: "missing",
      }),
    ).toBe("  - SUPABASE_KEY: missing");
  });
});

describe("classifyEndpointFailure", () => {
  test("isHttpAuthFailureStatus matches 401 and 403", () => {
    expect(isHttpAuthFailureStatus(401)).toBe(true);
    expect(isHttpAuthFailureStatus(403)).toBe(true);
    expect(isHttpAuthFailureStatus(404)).toBe(false);
  });

  test("classifyEndpointFailure maps connection errors to unreachable", () => {
    expect(
      classifyEndpointFailure(
        Object.assign(new Error("connect refused"), { code: "ECONNREFUSED" }),
      ),
    ).toEqual({ kind: "unreachable", detail: "econnrefused" });
  });

  test("classifyEndpointFailure maps redis auth errors to unauthenticated", () => {
    expect(
      classifyEndpointFailure(
        Object.assign(new Error("NOAUTH Authentication required"), {
          code: "NOAUTH",
        }),
      ),
    ).toEqual({ kind: "unauthenticated", detail: "noauth" });
  });
});

describe("collectServerEnvUsabilityIssues", () => {
  const stubCheckers: ServerEnvEndpointCheckers = {
    checkOpenRouteServiceApiKey: async () => null,
    checkSupabaseEndpoint: async () => null,
    checkRedisEndpoint: async () => null,
  };

  test("skips endpoint checks when required values are missing", async () => {
    const checkOpenRouteServiceApiKey = jest.fn(async () => null);
    const checkSupabaseEndpoint = jest.fn(async () => null);
    const checkRedisEndpoint = jest.fn(async () => null);

    const issues = await collectServerEnvUsabilityIssues(
      {},
      {
        checkOpenRouteServiceApiKey,
        checkSupabaseEndpoint,
        checkRedisEndpoint,
      },
    );

    expect(issues).toHaveLength(4);
    expect(checkOpenRouteServiceApiKey).not.toHaveBeenCalled();
    expect(checkSupabaseEndpoint).not.toHaveBeenCalled();
    expect(checkRedisEndpoint).not.toHaveBeenCalled();
  });

  test("runs endpoint checks only for present values", async () => {
    const checkOpenRouteServiceApiKey = jest.fn(async () => null);
    const checkSupabaseEndpoint = jest.fn(async () => null);
    const checkRedisEndpoint = jest.fn(async () => ({
      name: REDIS_URL_ENV,
      kind: "unreachable" as const,
      detail: "econnrefused",
    }));

    const issues = await collectServerEnvUsabilityIssues(
      {
        OPEN_ROUTE_SERVICE_API_KEY: "ors-key",
        SUPABASE_URL: "http://127.0.0.1:54331",
        SUPABASE_KEY: "supabase-key",
        REDIS_URL: "redis://127.0.0.1:6380",
      },
      {
        checkOpenRouteServiceApiKey,
        checkSupabaseEndpoint,
        checkRedisEndpoint,
      },
    );

    expect(checkOpenRouteServiceApiKey).toHaveBeenCalledWith("ors-key");
    expect(checkSupabaseEndpoint).toHaveBeenCalledWith(
      "http://127.0.0.1:54331",
      "supabase-key",
    );
    expect(checkRedisEndpoint).toHaveBeenCalledWith("redis://127.0.0.1:6380");
    expect(issues).toEqual([
      {
        name: REDIS_URL_ENV,
        kind: "unreachable",
        detail: "econnrefused",
      },
    ]);
  });

  test("uses stub checkers without calling real services", async () => {
    const issues = await collectServerEnvUsabilityIssues(
      {
        OPEN_ROUTE_SERVICE_API_KEY: "ors-key",
        SUPABASE_URL: "http://127.0.0.1:54331",
        SUPABASE_KEY: "supabase-key",
        REDIS_URL: "redis://127.0.0.1:6380",
      },
      stubCheckers,
    );

    expect(issues).toEqual([]);
  });
});
