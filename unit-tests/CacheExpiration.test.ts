import { isCacheEntryExpired } from "../app/_client/pure/bathroom/CacheExpiration";

describe("CacheExpiration", () => {
  const nowMs = 1_000_000;
  const expirationSecs = 60;

  test("returns true when updated_at is older than the expiration window", () => {
    expect(
      isCacheEntryExpired({ updatedAtMs: nowMs - 90_000 }, nowMs, expirationSecs),
    ).toBe(true);
  });

  test("returns false when updated_at is within the expiration window", () => {
    expect(
      isCacheEntryExpired({ updatedAtMs: nowMs - 30_000 }, nowMs, expirationSecs),
    ).toBe(false);
  });

  test("returns false at the exact expiration boundary", () => {
    expect(
      isCacheEntryExpired(
        { updatedAtMs: nowMs - expirationSecs * 1000 },
        nowMs,
        expirationSecs,
      ),
    ).toBe(false);
  });

  test("returns false when timestamps are not finite", () => {
    expect(
      isCacheEntryExpired({ updatedAtMs: Number.NaN }, nowMs, expirationSecs),
    ).toBe(false);
    expect(
      isCacheEntryExpired({ updatedAtMs: nowMs }, Number.NaN, expirationSecs),
    ).toBe(false);
  });
});
