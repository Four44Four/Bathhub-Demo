import { REDIS_RATE_LIMIT_KEY_PREFIX } from "../redis/RedisConstants";

export type RateLimitScope =
  | "bathroom-create"
  | "bathroom-read-sync"
  | "bathroom-read-by-id"
  | "bathroom-find-nearest"
  | "bathroom-update"
  | "ors-path"
  | "user-settings-default-db"
  | "user-settings-migration";

export type RateLimitWindowConfig = {
  readonly maxRequests: number;
  readonly windowSeconds: number;
};

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

export function buildRateLimitKey(
  scope: RateLimitScope,
  clientIp: string,
  windowSeconds: number,
): string {
  return `${REDIS_RATE_LIMIT_KEY_PREFIX}${scope}:${clientIp}:${windowSeconds}`;
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
  }
}

export function formatRateLimitExceededMessage(
  scope: RateLimitScope,
  windowSeconds: number,
  maxRequests: number,
): string {
  const scopeLabel = formatRateLimitScopeLabel(scope);
  const windowLabel = formatRateLimitWindowLabel(windowSeconds);
  return `Rate limit exceeded: ${scopeLabel} is limited to ${maxRequests} requests per ${windowLabel}.`;
}

export async function checkRateLimits(
  scope: RateLimitScope,
  clientIp: string,
  windows: readonly RateLimitWindowConfig[],
  increment: RateLimitIncrement,
): Promise<RateLimitCheckResult> {
  for (const window of windows) {
    const key = buildRateLimitKey(scope, clientIp, window.windowSeconds);
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
