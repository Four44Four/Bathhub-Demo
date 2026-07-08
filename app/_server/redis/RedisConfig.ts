import "server-only";

export {
  REDIS_MAX_MEMORY_EVICTION_POLICY,
  REDIS_RATE_LIMIT_KEY_PREFIX,
} from "../pure/redis/RedisConstants";

/** Minimum interval between repeated Redis connection error logs. */
export const REDIS_ERROR_LOG_INTERVAL_MS = 10_000;

/** Default `ioredis` client options applied to every server Redis connection. */
export const REDIS_IOREDIS_CLIENT_DEFAULTS = {
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
} as const;
