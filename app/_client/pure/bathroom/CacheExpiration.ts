export type CacheEntryTimestamp = {
  updatedAtMs: number;
};

/** Returns true when the entry is older than the configured expiration window. */
export function isCacheEntryExpired(
  entry: CacheEntryTimestamp,
  nowMs: number,
  expirationSecs: number,
): boolean {
  if (!Number.isFinite(entry.updatedAtMs) || !Number.isFinite(nowMs)) {
    return false;
  }
  return nowMs - entry.updatedAtMs > expirationSecs * 1000;
}
