import { classifyEndpointFailure, isHttpAuthFailureStatus } from "../app/_server/pure/classifyEndpointFailure";
import {
  formatEnvVarUsabilityIssueLine,
  formatEnvVarUsabilityIssuesMessage,
  formatEnvVarUsabilityWarningsMessage,
  isBlockingEnvVarUsabilityIssue,
  issuesFromMissingEnvVarNames,
  partitionEnvVarUsabilityIssues,
} from "../app/_server/pure/EnvVarUsability";
import {
  OPEN_ROUTE_SERVICE_API_KEY_ENV,
  REDIS_URL_ENV,
  SUPABASE_KEY_ENV,
} from "../app/_server/pure/RequiredEnvVars";
import {
  assertServerEnvValid,
  collectServerEnvUsabilityIssues,
} from "../app/_server/bootstrap/validateServerEnv";
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

  test("isBlockingEnvVarUsabilityIssue treats ORS unreachable as non-blocking", () => {
    expect(
      isBlockingEnvVarUsabilityIssue({
        name: OPEN_ROUTE_SERVICE_API_KEY_ENV,
        kind: "unreachable",
        detail: "timed out",
      }),
    ).toBe(false);
    expect(
      isBlockingEnvVarUsabilityIssue({
        name: OPEN_ROUTE_SERVICE_API_KEY_ENV,
        kind: "unauthenticated",
        detail: "HTTP 401",
      }),
    ).toBe(true);
    expect(
      isBlockingEnvVarUsabilityIssue({
        name: OPEN_ROUTE_SERVICE_API_KEY_ENV,
        kind: "missing",
      }),
    ).toBe(true);
    expect(
      isBlockingEnvVarUsabilityIssue({
        name: REDIS_URL_ENV,
        kind: "unreachable",
        detail: "econnrefused",
      }),
    ).toBe(true);
  });

  test("partitionEnvVarUsabilityIssues separates blocking issues from warnings", () => {
    const orsUnreachable = {
      name: OPEN_ROUTE_SERVICE_API_KEY_ENV,
      kind: "unreachable" as const,
      detail: "timed out",
    };
    const redisUnreachable = {
      name: REDIS_URL_ENV,
      kind: "unreachable" as const,
      detail: "econnrefused",
    };

    expect(
      partitionEnvVarUsabilityIssues([orsUnreachable, redisUnreachable]),
    ).toEqual({
      blocking: [redisUnreachable],
      warnings: [orsUnreachable],
    });
  });

  test("formatEnvVarUsabilityWarningsMessage notes that startup will continue", () => {
    expect(
      formatEnvVarUsabilityWarningsMessage([
        {
          name: OPEN_ROUTE_SERVICE_API_KEY_ENV,
          kind: "unreachable",
          detail: "timed out",
        },
      ]),
    ).toBe(
      "Unreachable environment variables (startup will continue):\n  - OPEN_ROUTE_SERVICE_API_KEY: unreachable (timed out)",
    );
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

  test("classifyEndpointFailure maps AbortError and TimeoutError to timed out", () => {
    expect(
      classifyEndpointFailure(Object.assign(new Error("aborted"), { name: "AbortError" })),
    ).toEqual({ kind: "unreachable", detail: "timed out" });
    expect(
      classifyEndpointFailure(
        Object.assign(new Error("The operation was aborted due to timeout"), {
          name: "TimeoutError",
        }),
      ),
    ).toEqual({ kind: "unreachable", detail: "timed out" });
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

describe("assertServerEnvValid", () => {
  const validEnv = {
    OPEN_ROUTE_SERVICE_API_KEY: "ors-key",
    SUPABASE_URL: "http://127.0.0.1:54331",
    SUPABASE_KEY: "supabase-key",
    REDIS_URL: "redis://127.0.0.1:6380",
  };

  test("allows startup when only ORS is unreachable", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const checkers: ServerEnvEndpointCheckers = {
      checkOpenRouteServiceApiKey: async () => ({
        name: OPEN_ROUTE_SERVICE_API_KEY_ENV,
        kind: "unreachable",
        detail: "timed out",
      }),
      checkSupabaseEndpoint: async () => null,
      checkRedisEndpoint: async () => null,
    };

    await expect(assertServerEnvValid(validEnv, checkers)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unreachable environment variables (startup will continue)"),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("OPEN_ROUTE_SERVICE_API_KEY: unreachable (timed out)"),
    );
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test("still blocks startup when ORS is unauthenticated", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const checkers: ServerEnvEndpointCheckers = {
      checkOpenRouteServiceApiKey: async () => ({
        name: OPEN_ROUTE_SERVICE_API_KEY_ENV,
        kind: "unauthenticated",
        detail: "HTTP 401",
      }),
      checkSupabaseEndpoint: async () => null,
      checkRedisEndpoint: async () => null,
    };

    await expect(assertServerEnvValid(validEnv, checkers)).rejects.toThrow(
      "Server environment validation failed",
    );

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
