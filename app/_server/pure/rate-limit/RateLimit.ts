import { REDIS_RATE_LIMIT_KEY_PREFIX } from "../redis/RedisConstants";

export type RateLimitScope =
  | "bathroom-create"
  | "bathroom-read-sync"
  | "bathroom-read-by-id"
  | "bathroom-find-nearest"
  | "bathroom-update"
  | "ors-path"
  | "user-settings-default-db"
  | "user-settings-migration"
  | "account-create"
  | "account-login"
  | "account-profile"
  | "account-image-upload";

export type RateLimitWindowConfig = {
  readonly maxRequests: number;
  readonly windowSeconds: number;
};

/** Same scope, with a higher cap for a signed-in account than for an IP. */
export type AuthSplitRateLimitWindows = {
  readonly loggedIn: readonly RateLimitWindowConfig[];
  readonly loggedOut: readonly RateLimitWindowConfig[];
};

export type RateLimitWindowSet =
  | readonly RateLimitWindowConfig[]
  | AuthSplitRateLimitWindows;

export type RateLimitCheckResult =
  | { allowed: true }
  | {
      allowed: false;
      scope: RateLimitScope;
      windowSeconds: number;
      maxRequests: number;
    };

export type RateLimitIncrement = (
  key: string,
  windowSeconds: number,
) => Promise<number>;

/** True when the caller should be counted by account id rather than client IP. */
export function hasRateLimitAccountId(
  accountId: string | null | undefined,
): accountId is string {
  return accountId != null && accountId.length > 0;
}

/**
 * Logged-in requests are counted by account id. Logged-out requests stay on the
 * client IP, which keeps existing per-IP keys unchanged.
 */
export function rateLimitSubjectId(
  accountId: string | null | undefined,
  clientIp: string,
): string {
  if (hasRateLimitAccountId(accountId)) {
    return accountId;
  }
  return clientIp;
}

export function isAuthSplitRateLimitWindows(
  windows: RateLimitWindowSet,
): windows is AuthSplitRateLimitWindows {
  return !Array.isArray(windows);
}

/** Picks the logged-in or logged-out windows when a scope defines both. */
export function resolveRateLimitWindows(
  windows: RateLimitWindowSet,
  accountId: string | null | undefined,
): readonly RateLimitWindowConfig[] {
  if (!isAuthSplitRateLimitWindows(windows)) {
    return windows;
  }
  if (hasRateLimitAccountId(accountId)) {
    return windows.loggedIn;
  }
  return windows.loggedOut;
}

export function buildRateLimitKey(
  scope: RateLimitScope,
  subjectId: string,
  windowSeconds: number,
): string {
  return `${REDIS_RATE_LIMIT_KEY_PREFIX}${scope}:${subjectId}:${windowSeconds}`;
}

export function isRateLimitExceeded(
  count: number,
  maxRequests: number,
): boolean {
  return count > maxRequests;
}

export function formatRateLimitWindowLabel(windowSeconds: number): string {
  if (windowSeconds === 60) {
    return "minute";
  }
  if (windowSeconds === 300) {
    return "5 minutes";
  }
  if (windowSeconds === 600) {
    return "10 minutes";
  }
  if (windowSeconds === 43_200) {
    return "12 hours";
  }
  if (windowSeconds === 86_400) {
    return "day";
  }
  return `${windowSeconds} seconds`;
}

export function formatRateLimitScopeLabel(scope: RateLimitScope): string {
  switch (scope) {
    case "bathroom-create":
      return "bathroom creation";
    case "bathroom-read-sync":
      return "bathroom reading and viewport sync";
    case "bathroom-read-by-id":
      return "bathroom reading by id";
    case "bathroom-find-nearest":
      return "nearest bathroom lookup";
    case "bathroom-update":
      return "bathroom updates";
    case "ors-path":
      return "route path generation";
    case "user-settings-default-db":
      return "default user settings database download";
    case "user-settings-migration":
      return "user settings migration scripts";
    case "account-create":
      return "account creation";
    case "account-login":
      return "account login";
    case "account-profile":
      return "account reading";
    case "account-image-upload":
      return "image uploading";
  }
}

export function formatRateLimitExceededMessage(
  scope: RateLimitScope,
  windowSeconds: number,
  maxRequests: number,
): string {
  const scopeLabel = formatRateLimitScopeLabel(scope);
  const windowLabel = formatRateLimitWindowLabel(windowSeconds);
  const requestWord = maxRequests === 1 ? "request" : "requests";
  return `Rate limit exceeded: ${scopeLabel} is limited to ${maxRequests} ${requestWord} per ${windowLabel}.`;
}

export async function checkRateLimits(
  scope: RateLimitScope,
  subjectId: string,
  windows: readonly RateLimitWindowConfig[],
  increment: RateLimitIncrement,
): Promise<RateLimitCheckResult> {
  for (const window of windows) {
    const key = buildRateLimitKey(scope, subjectId, window.windowSeconds);
    const count = await increment(key, window.windowSeconds);
    if (isRateLimitExceeded(count, window.maxRequests)) {
      return {
        allowed: false,
        scope,
        windowSeconds: window.windowSeconds,
        maxRequests: window.maxRequests,
      };
    }
  }

  return { allowed: true };
}
