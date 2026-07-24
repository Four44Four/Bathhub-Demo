import "server-only";

import { headers } from "next/headers";

import { getClientIpFromForwardedHeaders } from "../pure/rate-limit/ClientIp";
import {
  checkRateLimits,
  formatRateLimitExceededMessage,
  type RateLimitScope,
} from "../pure/rate-limit/RateLimit";
import { getRedisPort } from "../redis/getRedisPort";
import { type RateLimitWindowConfig } from "../pure/rate-limit/RateLimit";
import { RATE_LIMIT_VIOLATE_LOG, SERVER_RATE_LIMITS } from "../ServerConstants";

export class RateLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitExceededError";
  }
}

export type RateLimitEnforcementResult =
  | { allowed: true }
  | { allowed: false; message: string };

const RATE_LIMIT_WINDOWS_BY_SCOPE: Record<
  RateLimitScope,
  readonly RateLimitWindowConfig[]
> = {
  "bathroom-create": [
    SERVER_RATE_LIMITS.bathroomCreate.perMinute,
    SERVER_RATE_LIMITS.bathroomCreate.perDay,
  ],
  "bathroom-read-sync": [SERVER_RATE_LIMITS.bathroomReadSync.per30Seconds],
  "bathroom-read-by-id": [SERVER_RATE_LIMITS.bathroomReadById.per30Seconds],
  "bathroom-find-nearest": [
    SERVER_RATE_LIMITS.bathroomFindNearest.perMinute,
  ],
  "bathroom-update": [SERVER_RATE_LIMITS.bathroomUpdate.perMinute],
  "ors-path": [
    SERVER_RATE_LIMITS.orsPath.perMinute,
    SERVER_RATE_LIMITS.orsPath.perDay,
  ],
  "user-settings-default-db": [
    SERVER_RATE_LIMITS.userSettingsDefaultDb.perMinute,
    SERVER_RATE_LIMITS.userSettingsDefaultDb.perDay,
  ],
  "user-settings-migration": [
    SERVER_RATE_LIMITS.userSettingsMigration.perMinute,
    SERVER_RATE_LIMITS.userSettingsMigration.perDay,
  ],
};

export type EnforceRateLimitDependencies = {
  getClientIp: () => Promise<string>;
  incrementWithExpiry: (key: string, expirySeconds: number) => Promise<number>;
};

export async function enforceRateLimit(
  scope: RateLimitScope,
  deps: EnforceRateLimitDependencies,
): Promise<void> {
  const clientIp = await deps.getClientIp();
  const result = await checkRateLimits(
    scope,
    clientIp,
    RATE_LIMIT_WINDOWS_BY_SCOPE[scope],
    deps.incrementWithExpiry,
  );

  if (!result.allowed) {
    if (RATE_LIMIT_VIOLATE_LOG) {
      console.warn(
        `Rate limit violation: type=${result.scope} ip=${clientIp}`,
      );
    }
    throw new RateLimitExceededError(
      formatRateLimitExceededMessage(
        result.scope,
        result.windowSeconds,
        result.maxRequests,
      ),
    );
  }
}

/** Enforces per-IP rate limits for the current server request using Redis. */
export async function enforceServerRateLimit(
  scope: RateLimitScope,
): Promise<void> {
  await enforceRateLimit(scope, await getServerRateLimitDependencies());
}

async function getServerRateLimitDependencies(): Promise<EnforceRateLimitDependencies> {
  const headerList = await headers();
  const redis = getRedisPort();

  return {
    getClientIp: async () =>
      getClientIpFromForwardedHeaders((name) => headerList.get(name)),
    incrementWithExpiry: (key, expirySeconds) =>
      redis.incrementWithExpiry(key, expirySeconds),
  };
}

/** Like `enforceRateLimit`, but returns a result instead of throwing on violation. */
export async function tryEnforceRateLimit(
  scope: RateLimitScope,
  deps: EnforceRateLimitDependencies,
): Promise<RateLimitEnforcementResult> {
  try {
    await enforceRateLimit(scope, deps);
    return { allowed: true };
  } catch (error: unknown) {
    if (error instanceof RateLimitExceededError) {
      return { allowed: false, message: error.message };
    }
    throw error;
  }
}

/**
 * Enforces per-IP rate limits without throwing for expected violations.
 * Use in server actions so Next.js does not log handled rate-limit denials as
 * uncaught errors.
 */
export async function tryEnforceServerRateLimit(
  scope: RateLimitScope,
): Promise<RateLimitEnforcementResult> {
  return tryEnforceRateLimit(scope, await getServerRateLimitDependencies());
}
