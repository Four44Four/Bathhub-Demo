import "server-only";

import { headers } from "next/headers";

import { accountIdFromAccessToken } from "../pure/accounts/AccountAccessToken";
import { getClientIpFromForwardedHeaders } from "../pure/rate-limit/ClientIp";
import {
  checkRateLimits,
  formatRateLimitExceededMessage,
  rateLimitSubjectId,
  resolveRateLimitWindows,
  type RateLimitScope,
  type RateLimitWindowSet,
} from "../pure/rate-limit/RateLimit";
import { getRedisPort } from "../redis/getRedisPort";
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

const RATE_LIMIT_WINDOWS_BY_SCOPE: Record<RateLimitScope, RateLimitWindowSet> =
  {
    "bathroom-create": [
      SERVER_RATE_LIMITS.bathroomCreate.perMinute,
      SERVER_RATE_LIMITS.bathroomCreate.perDay,
    ],
    "bathroom-read-sync": {
      loggedIn: [SERVER_RATE_LIMITS.bathroomReadSync.loggedInPer30Seconds],
      loggedOut: [SERVER_RATE_LIMITS.bathroomReadSync.loggedOutPer30Seconds],
    },
    "bathroom-read-by-id": {
      loggedIn: [SERVER_RATE_LIMITS.bathroomReadById.loggedInPer30Seconds],
      loggedOut: [SERVER_RATE_LIMITS.bathroomReadById.loggedOutPer30Seconds],
    },
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
    "account-create": [SERVER_RATE_LIMITS.accountCreate.per12Hours],
    "account-login": [SERVER_RATE_LIMITS.accountLogin.per5Minutes],
    "account-profile": [SERVER_RATE_LIMITS.accountProfile.perMinute],
  };

export type EnforceRateLimitDependencies = {
  getClientIp: () => Promise<string>;
  getAccountId?: () => Promise<string | null>;
  incrementWithExpiry: (key: string, expirySeconds: number) => Promise<number>;
};

export async function enforceRateLimit(
  scope: RateLimitScope,
  deps: EnforceRateLimitDependencies,
): Promise<void> {
  const clientIp = await deps.getClientIp();
  const accountId = (await deps.getAccountId?.()) ?? null;
  const subjectId = rateLimitSubjectId(accountId, clientIp);
  const result = await checkRateLimits(
    scope,
    subjectId,
    resolveRateLimitWindows(RATE_LIMIT_WINDOWS_BY_SCOPE[scope], accountId),
    deps.incrementWithExpiry,
  );

  if (!result.allowed) {
    if (RATE_LIMIT_VIOLATE_LOG) {
      console.warn(
        accountId != null && accountId.length > 0
          ? `Rate limit violation: type=${result.scope} account=${accountId}`
          : `Rate limit violation: type=${result.scope} ip=${clientIp}`,
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

/** Enforces rate limits for the current server request using Redis. */
export async function enforceServerRateLimit(
  scope: RateLimitScope,
  accountId?: string | null,
): Promise<void> {
  await enforceRateLimit(scope, await getServerRateLimitDependencies(accountId));
}

async function getServerRateLimitDependencies(
  accountId?: string | null,
): Promise<EnforceRateLimitDependencies> {
  const headerList = await headers();
  const redis = getRedisPort();

  return {
    getClientIp: async () =>
      getClientIpFromForwardedHeaders((name) => headerList.get(name)),
    getAccountId: async () =>
      accountId != null && accountId.length > 0 ? accountId : null,
    incrementWithExpiry: (key, expirySeconds) =>
      redis.incrementWithExpiry(key, expirySeconds),
  };
}

export async function tryEnforceActorRateLimit(
  scope: RateLimitScope,
  accessToken?: string | null,
): Promise<RateLimitEnforcementResult> {
  const accountId = accountIdFromAccessToken(accessToken);
  if (accountId !== null) {
    return tryEnforceServerRateLimit(scope, accountId);
  }
  return tryEnforceServerRateLimit(scope);
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
  accountId?: string | null,
): Promise<RateLimitEnforcementResult> {
  return tryEnforceRateLimit(
    scope,
    await getServerRateLimitDependencies(accountId),
  );
}
