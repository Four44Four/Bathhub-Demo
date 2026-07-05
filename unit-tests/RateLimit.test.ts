import {
  getClientIpFromForwardedHeaders,
  normalizeIpCandidate,
} from "../app/_server/pure/rate-limit/ClientIp";
import {
  buildRateLimitKey,
  checkRateLimits,
  formatRateLimitExceededMessage,
  formatRateLimitScopeLabel,
  formatRateLimitWindowLabel,
  isRateLimitExceeded,
} from "../app/_server/pure/rate-limit/RateLimit";
import { SERVER_RATE_LIMITS } from "../app/_server/ServerConstants";
import {
  enforceRateLimit,
  RateLimitExceededError,
  tryEnforceRateLimit,
} from "../app/_server/rate-limit/enforceRateLimit";

describe("ClientIp", () => {
  test("getClientIpFromForwardedHeaders prefers the first x-forwarded-for hop", () => {
    expect(
      getClientIpFromForwardedHeaders((name) =>
        name === "x-forwarded-for" ? "203.0.113.1, 10.0.0.2" : null,
      ),
    ).toBe("203.0.113.1");
  });

  test("getClientIpFromForwardedHeaders strips IPv4 ports from x-forwarded-for", () => {
    expect(
      getClientIpFromForwardedHeaders((name) =>
        name === "x-forwarded-for" ? "203.0.113.1:54321, 10.0.0.2" : null,
      ),
    ).toBe("203.0.113.1");
  });

  test("getClientIpFromForwardedHeaders prefers cf-connecting-ip over x-forwarded-for", () => {
    expect(
      getClientIpFromForwardedHeaders((name) => {
        if (name === "cf-connecting-ip") return "198.51.100.10";
        if (name === "x-forwarded-for") return "203.0.113.1, 10.0.0.2";
        return null;
      }),
    ).toBe("198.51.100.10");
  });

  test("getClientIpFromForwardedHeaders falls back to x-real-ip", () => {
    expect(
      getClientIpFromForwardedHeaders((name) =>
        name === "x-real-ip" ? "198.51.100.4" : null,
      ),
    ).toBe("198.51.100.4");
  });

  test("getClientIpFromForwardedHeaders parses RFC 7239 forwarded headers", () => {
    expect(
      getClientIpFromForwardedHeaders((name) =>
        name === "forwarded"
          ? 'for=192.0.2.60;proto=http;by=203.0.113.43, for="[2001:db8::1]:8080"'
          : null,
      ),
    ).toBe("192.0.2.60");
  });

  test("getClientIpFromForwardedHeaders uses the direct connection fallback", () => {
    expect(
      getClientIpFromForwardedHeaders(() => null, "203.0.113.99"),
    ).toBe("203.0.113.99");
  });

  test("getClientIpFromForwardedHeaders returns unknown when no proxy headers exist", () => {
    expect(getClientIpFromForwardedHeaders(() => null)).toBe("unknown");
  });

  test("getClientIpFromForwardedHeaders skips invalid proxy header values", () => {
    expect(
      getClientIpFromForwardedHeaders((name) => {
        if (name === "cf-connecting-ip") return "999.999.999.999";
        if (name === "x-forwarded-for") return "203.0.113.7, 10.0.0.2";
        return null;
      }),
    ).toBe("203.0.113.7");
  });

  test("getClientIpFromForwardedHeaders rejects invalid direct fallback values", () => {
    expect(getClientIpFromForwardedHeaders(() => null, "999.999.999.999")).toBe(
      "unknown",
    );
  });

  test("normalizeIpCandidate strips IPv6 brackets and ports", () => {
    expect(normalizeIpCandidate("[2001:db8::1]:8080")).toBe("2001:db8::1");
  });
});

describe("RateLimit pure logic", () => {
  test("buildRateLimitKey namespaces scope, ip, and window", () => {
    expect(buildRateLimitKey("bathroom-create", "203.0.113.1", 60)).toBe(
      "rl:bathroom-create:203.0.113.1:60",
    );
  });

  test("isRateLimitExceeded is true only after the limit is passed", () => {
    expect(isRateLimitExceeded(5, 5)).toBe(false);
    expect(isRateLimitExceeded(6, 5)).toBe(true);
  });

  test("formatRateLimitExceededMessage describes the exceeded window", () => {
    expect(
      formatRateLimitExceededMessage("ors-path", 60, 10),
    ).toBe(
      "Rate limit exceeded: route path generation is limited to 10 requests per minute.",
    );
  });

  test("formatRateLimitScopeLabel and formatRateLimitWindowLabel cover known scopes", () => {
    expect(formatRateLimitScopeLabel("bathroom-create")).toBe(
      "bathroom creation",
    );
    expect(formatRateLimitScopeLabel("bathroom-read-sync")).toBe(
      "bathroom reading and viewport sync",
    );
    expect(formatRateLimitScopeLabel("bathroom-find-nearest")).toBe(
      "nearest bathroom lookup",
    );
    expect(formatRateLimitScopeLabel("bathroom-update")).toBe(
      "bathroom updates",
    );
    expect(formatRateLimitScopeLabel("user-settings-default-db")).toBe(
      "default user settings database download",
    );
    expect(formatRateLimitScopeLabel("user-settings-migration")).toBe(
      "user settings migration scripts",
    );
    expect(formatRateLimitWindowLabel(30)).toBe("30 seconds");
    expect(formatRateLimitWindowLabel(86_400)).toBe("day");
  });

  test("SERVER_RATE_LIMITS matches the bathroom creation and ORS spec", () => {
    expect(SERVER_RATE_LIMITS.bathroomCreate.perMinute).toEqual({
      maxRequests: 5,
      windowSeconds: 60,
    });
    expect(SERVER_RATE_LIMITS.bathroomCreate.perDay).toEqual({
      maxRequests: 15,
      windowSeconds: 86_400,
    });
    expect(SERVER_RATE_LIMITS.bathroomReadSync.per30Seconds).toEqual({
      maxRequests: 100,
      windowSeconds: 30,
    });
    expect(SERVER_RATE_LIMITS.bathroomFindNearest.perMinute).toEqual({
      maxRequests: 20,
      windowSeconds: 60,
    });
    expect(SERVER_RATE_LIMITS.bathroomUpdate.perMinute).toEqual({
      maxRequests: 20,
      windowSeconds: 60,
    });
    expect(SERVER_RATE_LIMITS.orsPath.perMinute).toEqual({
      maxRequests: 10,
      windowSeconds: 60,
    });
    expect(SERVER_RATE_LIMITS.orsPath.perDay).toEqual({
      maxRequests: 300,
      windowSeconds: 86_400,
    });
  });

  test("SERVER_RATE_LIMITS matches the user settings config spec", () => {
    expect(SERVER_RATE_LIMITS.userSettingsDefaultDb.perMinute).toEqual({
      maxRequests: 5,
      windowSeconds: 60,
    });
    expect(SERVER_RATE_LIMITS.userSettingsDefaultDb.perDay).toEqual({
      maxRequests: 20,
      windowSeconds: 86_400,
    });
    expect(SERVER_RATE_LIMITS.userSettingsMigration.perMinute).toEqual({
      maxRequests: 5,
      windowSeconds: 60,
    });
    expect(SERVER_RATE_LIMITS.userSettingsMigration.perDay).toEqual({
      maxRequests: 50,
      windowSeconds: 86_400,
    });
  });

  test("checkRateLimits allows requests until each configured window is exceeded", async () => {
    const counts = new Map<string, number>();
    const increment = async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    };

    const windows = [
      { maxRequests: 2, windowSeconds: 60 },
      { maxRequests: 4, windowSeconds: 86_400 },
    ] as const;

    expect(
      await checkRateLimits("bathroom-create", "203.0.113.1", windows, increment),
    ).toEqual({ allowed: true });
    expect(
      await checkRateLimits("bathroom-create", "203.0.113.1", windows, increment),
    ).toEqual({ allowed: true });
    expect(
      await checkRateLimits("bathroom-create", "203.0.113.1", windows, increment),
    ).toEqual({
      allowed: false,
      scope: "bathroom-create",
      windowSeconds: 60,
      maxRequests: 2,
    });
  });

  test("enforceRateLimit throws RateLimitExceededError when a window is exceeded", async () => {
    let count = 0;
    await expect(
      enforceRateLimit("ors-path", {
        getClientIp: async () => "203.0.113.9",
        incrementWithExpiry: async () => {
          count += 1;
          return count;
        },
      }),
    ).resolves.toBeUndefined();

    count = SERVER_RATE_LIMITS.orsPath.perMinute.maxRequests;
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      enforceRateLimit("ors-path", {
        getClientIp: async () => "203.0.113.9",
        incrementWithExpiry: async () => {
          count += 1;
          return count;
        },
      }),
    ).rejects.toBeInstanceOf(RateLimitExceededError);
    expect(warnSpy).toHaveBeenCalledWith(
      "Rate limit violation: type=ors-path ip=203.0.113.9",
    );
    warnSpy.mockRestore();
  });

  test("tryEnforceRateLimit returns a denial result instead of throwing", async () => {
    let count = 0;
    const deps = {
      getClientIp: async () => "203.0.113.9",
      incrementWithExpiry: async () => {
        count += 1;
        return count;
      },
    };

    await expect(tryEnforceRateLimit("ors-path", deps)).resolves.toEqual({
      allowed: true,
    });

    count = SERVER_RATE_LIMITS.orsPath.perMinute.maxRequests;
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    await expect(tryEnforceRateLimit("ors-path", deps)).resolves.toEqual({
      allowed: false,
      message:
        "Rate limit exceeded: route path generation is limited to 10 requests per minute.",
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "Rate limit violation: type=ors-path ip=203.0.113.9",
    );
    warnSpy.mockRestore();
  });
});
