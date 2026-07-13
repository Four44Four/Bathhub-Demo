/** Prefix for Redis-backed rate limit counter keys (`rl:<scope>:<ip>:<window>`). */
export const REDIS_RATE_LIMIT_KEY_PREFIX = "rl:" as const;

/** Redis server maxmemory eviction policy required by serverside caching spec. */
export const REDIS_MAX_MEMORY_EVICTION_POLICY = "allkeys-lru" as const;

export type ReadCacheNamespace = "dev" | "test" | "prod";

export const READ_CACHE_TABLE_BATHROOM_DATA_PRIMARY =
  "bathroom_data_primary" as const;

export const READ_CACHE_TABLE_USER_DATA_PRIMARY = "user_data_primary" as const;

export type ReadCacheTableName =
  | typeof READ_CACHE_TABLE_BATHROOM_DATA_PRIMARY
  | typeof READ_CACHE_TABLE_USER_DATA_PRIMARY;

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
  tableName: ReadCacheTableName,
  id: number,
): string {
  return `${namespace}:${tableName}:${id}`;
}

export function buildBathroomH3CellCacheKey(
  namespace: ReadCacheNamespace,
  resolution: number,
  cell: string,
): string {
  return `${namespace}:bathroom-h3-r${resolution}:${cell}`;
}
