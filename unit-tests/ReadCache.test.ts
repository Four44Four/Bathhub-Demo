import {
  bathroomRowToCachedRecord,
  nearestBathroomLocationToCachedRecord,
  parseCachedBathroomRecord,
  serializeCachedBathroomRecord,
} from "../app/_server/pure/redis/CachedBathroomRecord";
import {
  parseCachedBathroomH3CellRecord,
  serializeCachedBathroomH3CellRecord,
} from "../app/_server/pure/redis/CachedBathroomH3CellRecord";
import {
  buildBathroomH3CellCacheKey,
  buildReadCacheKey,
  READ_CACHE_TABLE_BATHROOM_DATA_PRIMARY,
  READ_CACHE_TABLE_USER_DATA_PRIMARY,
  REDIS_MAX_MEMORY_EVICTION_POLICY,
  REDIS_RATE_LIMIT_KEY_PREFIX,
  resolveReadCacheNamespace,
} from "../app/_server/pure/redis/RedisConstants";
import { buildRateLimitKey } from "../app/_server/pure/rate-limit/RateLimit";
import { bathroomLatLongToH3Cell } from "../app/_server/pure/geospatial/BathroomH3Cells";
import {
  createReadCache,
  runReadCacheSideEffect,
} from "../app/_server/redis/ReadCache";
import type { RedisPort } from "../app/_server/redis/RedisPort";
import {
  H3_BATHROOM_CELL_RESOLUTION,
  H3_BATHROOM_MAX_BOUNDS_CACHE_CELLS,
  READ_CACHE_TTL_SECS,
} from "../app/_server/ServerConstants";

describe("RedisConstants", () => {
  test("buildReadCacheKey follows namespace:table-name:id scheme", () => {
    expect(
      buildReadCacheKey("dev", READ_CACHE_TABLE_BATHROOM_DATA_PRIMARY, 8),
    ).toBe("dev:bathroom_data_primary:8");
    expect(
      buildReadCacheKey("prod", READ_CACHE_TABLE_USER_DATA_PRIMARY, 193),
    ).toBe("prod:user_data_primary:193");
  });

  test("buildBathroomH3CellCacheKey namespaces resolution-specific cells", () => {
    expect(buildBathroomH3CellCacheKey("dev", 10, "8a2a1072b59ffff")).toBe(
      "dev:bathroom-h3-r10:8a2a1072b59ffff",
    );
  });

  test("resolveReadCacheNamespace maps NODE_ENV to dev, test, or prod", () => {
    expect(resolveReadCacheNamespace("production")).toBe("prod");
    expect(resolveReadCacheNamespace("test")).toBe("test");
    expect(resolveReadCacheNamespace("development")).toBe("dev");
    expect(resolveReadCacheNamespace(undefined)).toBe("dev");
  });

  test("rate limit keys use centralized prefix", () => {
    expect(
      buildRateLimitKey("bathroom-create", "203.0.113.1", 60),
    ).toBe(`${REDIS_RATE_LIMIT_KEY_PREFIX}bathroom-create:203.0.113.1:60`);
  });

  test("max memory eviction policy is least recently used", () => {
    expect(REDIS_MAX_MEMORY_EVICTION_POLICY).toBe("allkeys-lru");
  });
});

describe("CachedBathroomRecord", () => {
  const sampleRow = {
    id: 9,
    latitude: 40.7,
    longitude: -74.0,
    verify_status: "verified" as const,
    temp_data: "x",
    created_at: "2026-01-01T00:00:00Z",
    version: 2,
  };

  test("serialize and parse round-trip full bathroom rows", () => {
    const serialized = serializeCachedBathroomRecord(
      bathroomRowToCachedRecord(sampleRow),
    );
    expect(parseCachedBathroomRecord(serialized)).toEqual(
      bathroomRowToCachedRecord(sampleRow),
    );
  });

  test("parseCachedBathroomRecord rejects malformed payloads", () => {
    expect(parseCachedBathroomRecord("{")).toBeNull();
    expect(parseCachedBathroomRecord(JSON.stringify({ id: "bad" }))).toBeNull();
  });

  test("nearestBathroomLocationToCachedRecord fills unknown fields with defaults", () => {
    expect(
      nearestBathroomLocationToCachedRecord({
        id: 1,
        latitude: 1,
        longitude: 2,
      }),
    ).toEqual({
      id: 1,
      latitude: 1,
      longitude: 2,
      verify_status: "pending",
      version: 0,
      temp_data: "",
      created_at: "",
    });
  });
});

describe("CachedBathroomH3CellRecord", () => {
  const sampleRow = {
    id: 9,
    latitude: 40.7,
    longitude: -74.0,
    verify_status: "verified" as const,
    temp_data: "x",
    created_at: "2026-01-01T00:00:00Z",
    version: 2,
  };

  test("serialize and parse round-trip H3 cell records, including empty cells", () => {
    const record = {
      resolution: 10,
      cell: "8a2a1072b59ffff",
      rows: [sampleRow],
    };

    expect(parseCachedBathroomH3CellRecord(
      serializeCachedBathroomH3CellRecord(record),
    )).toEqual(record);

    expect(parseCachedBathroomH3CellRecord(
      serializeCachedBathroomH3CellRecord({
        resolution: 10,
        cell: "8a2a1072b597fff",
        rows: [],
      }),
    )?.rows).toEqual([]);
  });

  test("parseCachedBathroomH3CellRecord rejects malformed payloads", () => {
    expect(parseCachedBathroomH3CellRecord("{")).toBeNull();
    expect(
      parseCachedBathroomH3CellRecord(
        JSON.stringify({ resolution: 10, cell: "abc", rows: [{ id: "bad" }] }),
      ),
    ).toBeNull();
  });
});

describe("ServerConstants read cache TTL", () => {
  test("READ_CACHE_TTL_SECS defaults to one hour", () => {
    expect(READ_CACHE_TTL_SECS).toBe(3600);
  });

  test("H3 bathroom cache constants use the configured defaults", () => {
    expect(H3_BATHROOM_CELL_RESOLUTION).toBe(10);
    expect(H3_BATHROOM_MAX_BOUNDS_CACHE_CELLS).toBe(2500);
  });
});

function createRedisMock(initialValue: string | null = null) {
  const incrementWithExpiry =
    jest
      .fn<
        ReturnType<RedisPort["incrementWithExpiry"]>,
        Parameters<RedisPort["incrementWithExpiry"]>
      >()
      .mockResolvedValue(1);
  const getString =
    jest
      .fn<
        ReturnType<RedisPort["getString"]>,
        Parameters<RedisPort["getString"]>
      >()
      .mockResolvedValue(initialValue);
  const setStringWithExpiry =
    jest
      .fn<
        ReturnType<RedisPort["setStringWithExpiry"]>,
        Parameters<RedisPort["setStringWithExpiry"]>
      >()
      .mockResolvedValue(undefined);
  const deleteKey =
    jest
      .fn<
        ReturnType<RedisPort["deleteKey"]>,
        Parameters<RedisPort["deleteKey"]>
      >()
      .mockResolvedValue(undefined);
  const redis = {
    incrementWithExpiry,
    getString,
    setStringWithExpiry,
    deleteKey,
  } satisfies RedisPort;

  return {
    redis,
    incrementWithExpiry,
    getString,
    setStringWithExpiry,
    deleteKey,
  };
}

describe("createReadCache", () => {
  const config = { namespace: "test" as const, ttlSecs: READ_CACHE_TTL_SECS };
  const sampleRow = {
    id: 9,
    latitude: 40.7,
    longitude: -74,
    verify_status: "verified" as const,
    temp_data: "",
    created_at: "2026-01-01T00:00:00Z",
    version: 2,
  };

  test("treats malformed bathroom cache entries as misses and deletes them", async () => {
    const mocks = createRedisMock("{");
    const cache = createReadCache({ redis: mocks.redis, config });

    await expect(cache.getBathroom(9)).resolves.toBeNull();
    expect(mocks.getString).toHaveBeenCalledWith(
      "test:bathroom_data_primary:9",
    );
    expect(mocks.deleteKey).toHaveBeenCalledWith(
      "test:bathroom_data_primary:9",
    );
  });

  test("rejects and deletes H3 records for another cell", async () => {
    const raw = serializeCachedBathroomH3CellRecord({
      resolution: 10,
      cell: "8a2a1072b59ffff",
      rows: [],
    });
    const mocks = createRedisMock(raw);
    const cache = createReadCache({ redis: mocks.redis, config });

    await expect(
      cache.getBathroomH3Cell("8a2a1072b597fff", 10),
    ).resolves.toBeNull();
    expect(mocks.deleteKey).toHaveBeenCalledWith(
      "test:bathroom-h3-r10:8a2a1072b597fff",
    );
  });

  test("writes bathroom rows with the configured TTL", async () => {
    const mocks = createRedisMock();
    const cache = createReadCache({ redis: mocks.redis, config });

    await cache.cacheBathroomRow(sampleRow);

    expect(mocks.setStringWithExpiry).toHaveBeenCalledTimes(1);
    const [key, serialized, ttl] = mocks.setStringWithExpiry.mock.calls[0];
    expect(key).toBe("test:bathroom_data_primary:9");
    expect(parseCachedBathroomRecord(serialized)).toEqual(
      bathroomRowToCachedRecord(sampleRow),
    );
    expect(ttl).toBe(READ_CACHE_TTL_SECS);
  });

  test("removes both a bathroom row and its matching H3 cell", async () => {
    const raw = serializeCachedBathroomRecord(
      bathroomRowToCachedRecord(sampleRow),
    );
    const mocks = createRedisMock(raw);
    const cache = createReadCache({ redis: mocks.redis, config });
    const cell = bathroomLatLongToH3Cell(
      sampleRow,
      H3_BATHROOM_CELL_RESOLUTION,
    );

    await cache.removeBathroom(sampleRow.id);

    expect(mocks.deleteKey).toHaveBeenNthCalledWith(
      1,
      "test:bathroom_data_primary:9",
    );
    expect(mocks.deleteKey).toHaveBeenNthCalledWith(
      2,
      `test:bathroom-h3-r10:${cell}`,
    );
  });
});

describe("runReadCacheSideEffect", () => {
  test("swallows cache failures after warning", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      runReadCacheSideEffect(async () => {
        throw new Error("redis unavailable");
      }),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      "[read-cache] side effect failed:",
      "redis unavailable",
    );

    warnSpy.mockRestore();
  });
});
