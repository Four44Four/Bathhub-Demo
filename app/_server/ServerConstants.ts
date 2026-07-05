import "server-only";

import { type RateLimitWindowConfig } from "./pure/rate-limit/RateLimit";

/** When true, log rate limit violations (scope and client IP) to the server console. */
export const RATE_LIMIT_VIOLATE_LOG = true;

export type { RateLimitWindowConfig };

export const SERVER_RATE_LIMITS = {
  bathroomCreate: {
    perMinute: { maxRequests: 5, windowSeconds: 60 },
    // perMinute: { maxRequests: 5, windowSeconds: 60 },
    perDay: { maxRequests: 15, windowSeconds: 86_400 },
  },
  bathroomReadSync: {
    per30Seconds: { maxRequests: 100, windowSeconds: 30 },
  },
  bathroomFindNearest: {
    perMinute: { maxRequests: 20, windowSeconds: 60 },
  },
  bathroomUpdate: {
    perMinute: { maxRequests: 20, windowSeconds: 60 },
  },
  orsPath: {
    perMinute: { maxRequests: 10, windowSeconds: 60 },
    // perMinute: { maxRequests: 10, windowSeconds: 60 },
    perDay: { maxRequests: 300, windowSeconds: 86_400 },
  },
  userSettingsDefaultDb: {
    perMinute: { maxRequests: 5, windowSeconds: 60 },
    // perMinute: { maxRequests: 5, windowSeconds: 60 },
    perDay: { maxRequests: 20, windowSeconds: 86_400 },
  },
  userSettingsMigration: {
    perMinute: { maxRequests: 5, windowSeconds: 60 },
    // perMinute: { maxRequests: 5, windowSeconds: 60 },
    perDay: { maxRequests: 50, windowSeconds: 86_400 },
  },
} as const satisfies Record<
  string,
  Record<string, RateLimitWindowConfig>
>;
