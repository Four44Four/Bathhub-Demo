/** Prefix for Redis-backed rate limit counter keys (`rl:<scope>:<ip>:<window>`). */
export const REDIS_RATE_LIMIT_KEY_PREFIX = "rl:" as const;

/** Redis server maxmemory eviction policy required by serverside caching spec. */
export const REDIS_MAX_MEMORY_EVICTION_POLICY = "allkeys-lru" as const;

export type ReadCacheNamespace = "dev" | "test" | "prod";

export type ReadCacheResource = "bathroom" | "user";

export function resolveReadCacheNamespace(
  nodeEnv: string | undefined,
): ReadCacheNamespace {
  if (nodeEnv === "production") {
    return "prod";
  }
  if (nodeEnv === "test") {
    return "test";
  }
  return "dev";
}

export function buildReadCacheKey(
  namespace: ReadCacheNamespace,
  resource: ReadCacheResource,
  id: number,
): string {
  return `${namespace}:${resource}:${id}`;
}

export function buildBathroomH3CellCacheKey(
  namespace: ReadCacheNamespace,
  resolution: number,
  cell: string,
): string {
  return `${namespace}:bathroom-h3-r${resolution}:${cell}`;
}
