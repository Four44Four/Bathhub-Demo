import { buildRateLimitKey } from "../app/_server/pure/rate-limit/RateLimit";
import {
  enforceRateLimit,
  type EnforceRateLimitDependencies,
  RateLimitExceededError,
} from "../app/_server/rate-limit/enforceRateLimit";
import { getRedisPort } from "../app/_server/redis/getRedisPort";
import { SERVER_RATE_LIMITS } from "../app/_server/ServerConstants";
import { disconnectRedisTestGlobals } from "./disconnectRedisTestGlobals";
import { requireLocalRedis } from "./requireLocalRedis";

function redisRateLimitDeps(clientIp: string): EnforceRateLimitDependencies {
  const redis = getRedisPort();
  return {
    getClientIp: async () => clientIp,
    incrementWithExpiry: (key, expirySeconds) =>
      redis.incrementWithExpiry(key, expirySeconds),
  };
}

async function prefillWindowCount(
  scope:
    | "bathroom-create"
    | "bathroom-read-sync"
    | "bathroom-find-nearest"
    | "bathroom-update"
    | "ors-path"
    | "user-settings-default-db"
    | "user-settings-migration",
  clientIp: string,
  windowSeconds: number,
  count: number,
): Promise<void> {
  const redis = getRedisPort();
  const key = buildRateLimitKey(scope, clientIp, windowSeconds);
  for (let i = 0; i < count; i++) {
    await redis.incrementWithExpiry(key, windowSeconds);
  }
}

describe("Redis-backed server rate limits", () => {
  beforeAll(() => {
    requireLocalRedis();
  });

  afterAll(async () => {
    await disconnectRedisTestGlobals();
  });

  test("local Redis env is configured", () => {
    const env = requireLocalRedis();
    expect(env.url).toMatch(/^redis:\/\//);
  });

  describe("window expiry", () => {
    test("incrementWithExpiry resets the counter after the TTL elapses", async () => {
      const redis = getRedisPort();
      const key = `rl:test-expiry:${Date.now()}`;
      const windowSeconds = 1;

      expect(await redis.incrementWithExpiry(key, windowSeconds)).toBe(1);
      expect(await redis.incrementWithExpiry(key, windowSeconds)).toBe(2);

      await new Promise((resolve) => setTimeout(resolve, 1_100));

      expect(await redis.incrementWithExpiry(key, windowSeconds)).toBe(1);
      await redis.deleteKey(key);
    });

    test("enforceRateLimit allows requests again after the window key expires", async () => {
      const clientIp = "203.0.113.99";
      const deps = redisRateLimitDeps(clientIp);
      const { maxRequests, windowSeconds } =
        SERVER_RATE_LIMITS.bathroomCreate.perMinute;
      const redis = getRedisPort();
      const key = buildRateLimitKey(
        "bathroom-create",
        clientIp,
        windowSeconds,
      );

      for (let i = 0; i < maxRequests; i++) {
        await enforceRateLimit("bathroom-create", deps);
      }

      await expect(enforceRateLimit("bathroom-create", deps)).rejects.toBeInstanceOf(
        RateLimitExceededError,
      );

      await redis.deleteKey(key);

      await expect(enforceRateLimit("bathroom-create", deps)).resolves.toBeUndefined();
    });
  });

  describe("bathroom-create", () => {
    test("allows up to 5 requests per minute per IP", async () => {
      const deps = redisRateLimitDeps("203.0.113.20");
      const { maxRequests } = SERVER_RATE_LIMITS.bathroomCreate.perMinute;

      for (let i = 0; i < maxRequests; i++) {
        await expect(
          enforceRateLimit("bathroom-create", deps),
        ).resolves.toBeUndefined();
      }

      await expect(enforceRateLimit("bathroom-create", deps)).rejects.toMatchObject({
        name: "RateLimitExceededError",
        message:
          "Rate limit exceeded: bathroom creation is limited to 5 requests per minute.",
      });
    });

    test("allows up to 15 requests per day per IP", async () => {
      const clientIp = "203.0.113.21";
      const deps = redisRateLimitDeps(clientIp);
      const { maxRequests, windowSeconds } =
        SERVER_RATE_LIMITS.bathroomCreate.perDay;

      await prefillWindowCount(
        "bathroom-create",
        clientIp,
        windowSeconds,
        maxRequests,
      );

      await expect(enforceRateLimit("bathroom-create", deps)).rejects.toMatchObject({
        name: "RateLimitExceededError",
        message:
          "Rate limit exceeded: bathroom creation is limited to 15 requests per day.",
      });
    });

    test("tracks limits independently per IP", async () => {
      const limitedIpDeps = redisRateLimitDeps("203.0.113.22");
      const otherIpDeps = redisRateLimitDeps("203.0.113.23");
      const { maxRequests } = SERVER_RATE_LIMITS.bathroomCreate.perMinute;

      for (let i = 0; i < maxRequests; i++) {
        await enforceRateLimit("bathroom-create", limitedIpDeps);
      }

      await expect(
        enforceRateLimit("bathroom-create", limitedIpDeps),
      ).rejects.toBeInstanceOf(RateLimitExceededError);
      await expect(
        enforceRateLimit("bathroom-create", otherIpDeps),
      ).resolves.toBeUndefined();
    });
  });

  describe("bathroom-read-sync", () => {
    test("allows up to 100 requests per 30 seconds per IP", async () => {
      const deps = redisRateLimitDeps("203.0.113.60");
      const { maxRequests } = SERVER_RATE_LIMITS.bathroomReadSync.per30Seconds;

      for (let i = 0; i < maxRequests; i++) {
        await expect(
          enforceRateLimit("bathroom-read-sync", deps),
        ).resolves.toBeUndefined();
      }

      await expect(
        enforceRateLimit("bathroom-read-sync", deps),
      ).rejects.toMatchObject({
        name: "RateLimitExceededError",
        message:
          "Rate limit exceeded: bathroom reading and viewport sync is limited to 100 requests per 30 seconds.",
      });
    });
  });

  describe("bathroom-find-nearest", () => {
    test("allows up to 20 requests per minute per IP", async () => {
      const deps = redisRateLimitDeps("203.0.113.61");
      const { maxRequests } = SERVER_RATE_LIMITS.bathroomFindNearest.perMinute;

      for (let i = 0; i < maxRequests; i++) {
        await expect(
          enforceRateLimit("bathroom-find-nearest", deps),
        ).resolves.toBeUndefined();
      }

      await expect(
        enforceRateLimit("bathroom-find-nearest", deps),
      ).rejects.toMatchObject({
        name: "RateLimitExceededError",
        message:
          "Rate limit exceeded: nearest bathroom lookup is limited to 20 requests per minute.",
      });
    });
  });

  describe("bathroom-update", () => {
    test("allows up to 20 requests per minute per IP", async () => {
      const deps = redisRateLimitDeps("203.0.113.62");
      const { maxRequests } = SERVER_RATE_LIMITS.bathroomUpdate.perMinute;

      for (let i = 0; i < maxRequests; i++) {
        await expect(
          enforceRateLimit("bathroom-update", deps),
        ).resolves.toBeUndefined();
      }

      await expect(
        enforceRateLimit("bathroom-update", deps),
      ).rejects.toMatchObject({
        name: "RateLimitExceededError",
        message:
          "Rate limit exceeded: bathroom updates is limited to 20 requests per minute.",
      });
    });
  });

  describe("ors-path", () => {
    test("allows up to 10 requests per minute per IP", async () => {
      const deps = redisRateLimitDeps("203.0.113.30");
      const { maxRequests } = SERVER_RATE_LIMITS.orsPath.perMinute;

      for (let i = 0; i < maxRequests; i++) {
        await expect(enforceRateLimit("ors-path", deps)).resolves.toBeUndefined();
      }

      await expect(enforceRateLimit("ors-path", deps)).rejects.toMatchObject({
        name: "RateLimitExceededError",
        message:
          "Rate limit exceeded: route path generation is limited to 10 requests per minute.",
      });
    });

    test("allows up to 300 requests per day per IP", async () => {
      const clientIp = "203.0.113.31";
      const deps = redisRateLimitDeps(clientIp);
      const { maxRequests, windowSeconds } = SERVER_RATE_LIMITS.orsPath.perDay;

      await prefillWindowCount("ors-path", clientIp, windowSeconds, maxRequests);

      await expect(enforceRateLimit("ors-path", deps)).rejects.toMatchObject({
        name: "RateLimitExceededError",
        message:
          "Rate limit exceeded: route path generation is limited to 300 requests per day.",
      });
    });
  });

  describe("user-settings-default-db", () => {
    test("allows up to 5 requests per minute per IP", async () => {
      const deps = redisRateLimitDeps("203.0.113.40");
      const { maxRequests } = SERVER_RATE_LIMITS.userSettingsDefaultDb.perMinute;

      for (let i = 0; i < maxRequests; i++) {
        await expect(
          enforceRateLimit("user-settings-default-db", deps),
        ).resolves.toBeUndefined();
      }

      await expect(
        enforceRateLimit("user-settings-default-db", deps),
      ).rejects.toMatchObject({
        name: "RateLimitExceededError",
        message:
          "Rate limit exceeded: default user settings database download is limited to 5 requests per minute.",
      });
    });

    test("allows up to 20 requests per day per IP", async () => {
      const clientIp = "203.0.113.41";
      const deps = redisRateLimitDeps(clientIp);
      const { maxRequests, windowSeconds } =
        SERVER_RATE_LIMITS.userSettingsDefaultDb.perDay;

      await prefillWindowCount(
        "user-settings-default-db",
        clientIp,
        windowSeconds,
        maxRequests,
      );

      await expect(
        enforceRateLimit("user-settings-default-db", deps),
      ).rejects.toMatchObject({
        name: "RateLimitExceededError",
        message:
          "Rate limit exceeded: default user settings database download is limited to 20 requests per day.",
      });
    });
  });

  describe("user-settings-migration", () => {
    test("allows up to 5 requests per minute per IP", async () => {
      const deps = redisRateLimitDeps("203.0.113.50");
      const { maxRequests } = SERVER_RATE_LIMITS.userSettingsMigration.perMinute;

      for (let i = 0; i < maxRequests; i++) {
        await expect(
          enforceRateLimit("user-settings-migration", deps),
        ).resolves.toBeUndefined();
      }

      await expect(
        enforceRateLimit("user-settings-migration", deps),
      ).rejects.toMatchObject({
        name: "RateLimitExceededError",
        message:
          "Rate limit exceeded: user settings migration scripts is limited to 5 requests per minute.",
      });
    });

    test("allows up to 50 requests per day per IP", async () => {
      const clientIp = "203.0.113.51";
      const deps = redisRateLimitDeps(clientIp);
      const { maxRequests, windowSeconds } =
        SERVER_RATE_LIMITS.userSettingsMigration.perDay;

      await prefillWindowCount(
        "user-settings-migration",
        clientIp,
        windowSeconds,
        maxRequests,
      );

      await expect(
        enforceRateLimit("user-settings-migration", deps),
      ).rejects.toMatchObject({
        name: "RateLimitExceededError",
        message:
          "Rate limit exceeded: user settings migration scripts is limited to 50 requests per day.",
      });
    });
  });
});
