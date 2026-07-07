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
  REDIS_MAX_MEMORY_EVICTION_POLICY,
  REDIS_RATE_LIMIT_KEY_PREFIX,
  resolveReadCacheNamespace,
} from "../app/_server/pure/redis/RedisConstants";
import { buildRateLimitKey } from "../app/_server/pure/rate-limit/RateLimit";
import {
  H3_BATHROOM_CELL_RESOLUTION,
  H3_BATHROOM_MAX_BOUNDS_CACHE_CELLS,
  READ_CACHE_TTL_SECS,
} from "../app/_server/ServerConstants";

describe("RedisConstants", () => {
  test("buildReadCacheKey follows namespace:resource:id scheme", () => {
    expect(buildReadCacheKey("dev", "bathroom", 8)).toBe("dev:bathroom:8");
    expect(buildReadCacheKey("prod", "user", 193)).toBe("prod:user:193");
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
