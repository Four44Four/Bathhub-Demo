import { createClient } from "@supabase/supabase-js";

import {
  createAt as bathroomDbCreate,
  getInBounds as bathroomDbReadInBounds,
  syncInBounds as bathroomDbSyncInBounds,
  updateVerifyStatus as bathroomDbUpdateVerifyStatus,
} from "../app/_server/database/bathroom-data-primary/CrudCore";
import { estimateViewportH3CellCount, bathroomLatLongToH3Cell } from "../app/_server/pure/geospatial/BathroomH3Cells";
import { parseCachedBathroomRecord } from "../app/_server/pure/redis/CachedBathroomRecord";
import { parseCachedBathroomH3CellRecord } from "../app/_server/pure/redis/CachedBathroomH3CellRecord";
import {
  buildBathroomH3CellCacheKey,
  buildReadCacheKey,
  resolveReadCacheNamespace,
} from "../app/_server/pure/redis/RedisConstants";
import { createReadCache } from "../app/_server/redis/ReadCache";
import { getRedisPort } from "../app/_server/redis/getRedisPort";
import { disconnectRedisTestGlobals } from "./disconnectRedisTestGlobals";
import {
  H3_BATHROOM_CELL_RESOLUTION,
  H3_BATHROOM_MAX_BOUNDS_CACHE_CELLS,
  READ_CACHE_TTL_SECS,
} from "../app/_server/ServerConstants";
import { type ViewportBounds } from "../app/_shared/BathroomDataPrimary";
import { requireLocalRedis } from "./requireLocalRedis";
import { requireLocalSupabaseEnv } from "./requireLocalSupabase";

const createdBathroomIds: number[] = [];

function boundsAround(
  latitude: number,
  longitude: number,
  delta = 0.001,
): ViewportBounds {
  return {
    lowerLeft: {
      latitude: latitude - delta,
      longitude: longitude - delta,
    },
    upperRight: {
      latitude: latitude + delta,
      longitude: longitude + delta,
    },
  };
}

describe("Redis-backed serverside read cache", () => {
  beforeAll(() => {
    requireLocalRedis();
    requireLocalSupabaseEnv();
  });

  afterAll(async () => {
    if (createdBathroomIds.length > 0) {
      const { url, key } = requireLocalSupabaseEnv();
      await createClient(url, key)
        .from("bathroom_data_primary")
        .delete()
        .in("id", createdBathroomIds);
    }

    await disconnectRedisTestGlobals();
  });

  test("caches bathroom rows with namespace:resource:id keys", async () => {
    const row = await bathroomDbCreate(-6.1, -11.2);
    createdBathroomIds.push(row.id);

    const redis = getRedisPort();
    const namespace = resolveReadCacheNamespace(process.env.NODE_ENV);
    const key = buildReadCacheKey(namespace, "bathroom", row.id);
    const cached = await redis.getString(key);

    expect(cached).not.toBeNull();
    const parsed = parseCachedBathroomRecord(cached!);
    expect(parsed?.id).toBe(row.id);
    expect(parsed?.latitude).toBeCloseTo(-6.1, 3);
    expect(parsed?.longitude).toBeCloseTo(-11.2, 3);
  });

  test("updateVerifyStatus invalidates cached bathroom entries", async () => {
    const row = await bathroomDbCreate(-6.25, -11.35);
    createdBathroomIds.push(row.id);

    const redis = getRedisPort();
    const key = buildReadCacheKey(
      resolveReadCacheNamespace(process.env.NODE_ENV),
      "bathroom",
      row.id,
    );

    expect(await redis.getString(key)).not.toBeNull();
    await bathroomDbUpdateVerifyStatus(row.id, "verified");
    expect(await redis.getString(key)).toBeNull();
  });

  test("updateVerifyStatus invalidates cached H3 cell entries", async () => {
    const row = await bathroomDbCreate(-6.27, -11.37);
    createdBathroomIds.push(row.id);

    const redis = getRedisPort();
    const h3Cell = bathroomLatLongToH3Cell(row, H3_BATHROOM_CELL_RESOLUTION);
    const h3Key = buildBathroomH3CellCacheKey(
      resolveReadCacheNamespace(process.env.NODE_ENV),
      H3_BATHROOM_CELL_RESOLUTION,
      h3Cell,
    );

    await bathroomDbReadInBounds(boundsAround(row.latitude, row.longitude));
    expect(await redis.getString(h3Key)).not.toBeNull();

    await bathroomDbUpdateVerifyStatus(row.id, "verified");
    expect(await redis.getString(h3Key)).toBeNull();
  });

  test("removeBathroom deletes cached entries and invalidates H3 cell entries", async () => {
    const row = await bathroomDbCreate(-6.3, -11.4);
    createdBathroomIds.push(row.id);

    const redis = getRedisPort();
    const readCache = createReadCache({
      redis,
      config: {
        namespace: resolveReadCacheNamespace(process.env.NODE_ENV),
        ttlSecs: READ_CACHE_TTL_SECS,
      },
    });
    const namespace = resolveReadCacheNamespace(process.env.NODE_ENV);
    const key = buildReadCacheKey(namespace, "bathroom", row.id);
    const h3Cell = bathroomLatLongToH3Cell(row, H3_BATHROOM_CELL_RESOLUTION);
    const h3Key = buildBathroomH3CellCacheKey(
      namespace,
      H3_BATHROOM_CELL_RESOLUTION,
      h3Cell,
    );
    const bounds = boundsAround(row.latitude, row.longitude);

    await bathroomDbReadInBounds(bounds);
    expect(await redis.getString(key)).not.toBeNull();
    expect(await redis.getString(h3Key)).not.toBeNull();

    await readCache.removeBathroom(row.id);
    expect(await redis.getString(key)).toBeNull();
    expect(await redis.getString(h3Key)).toBeNull();
  });

  test("sync deleteIds invalidate cached H3 cell entries", async () => {
    const row = await bathroomDbCreate(-6.42, -11.52);
    createdBathroomIds.push(row.id);

    const redis = getRedisPort();
    const namespace = resolveReadCacheNamespace(process.env.NODE_ENV);
    const h3Cell = bathroomLatLongToH3Cell(row, H3_BATHROOM_CELL_RESOLUTION);
    const h3Key = buildBathroomH3CellCacheKey(
      namespace,
      H3_BATHROOM_CELL_RESOLUTION,
      h3Cell,
    );
    const bounds = boundsAround(row.latitude, row.longitude);

    await bathroomDbReadInBounds(bounds);
    expect(await redis.getString(h3Key)).not.toBeNull();

    const { url, key } = requireLocalSupabaseEnv();
    await createClient(url, key)
      .from("bathroom_data_primary")
      .delete()
      .eq("id", row.id);
    createdBathroomIds.pop();

    await bathroomDbSyncInBounds(bounds, [{ id: row.id, version: row.version }]);
    expect(await redis.getString(h3Key)).toBeNull();
  });

  test("bounds reads cache and reuse complete H3 cell entries", async () => {
    const row = await bathroomDbCreate(-6.45, -11.55);
    createdBathroomIds.push(row.id);

    const redis = getRedisPort();
    const namespace = resolveReadCacheNamespace(process.env.NODE_ENV);
    const h3Cell = bathroomLatLongToH3Cell(row, H3_BATHROOM_CELL_RESOLUTION);
    const h3Key = buildBathroomH3CellCacheKey(
      namespace,
      H3_BATHROOM_CELL_RESOLUTION,
      h3Cell,
    );
    const bounds = boundsAround(row.latitude, row.longitude);

    expect((await bathroomDbReadInBounds(bounds)).map((entry) => entry.id)).toContain(
      row.id,
    );

    const cached = await redis.getString(h3Key);
    expect(cached).not.toBeNull();
    expect(parseCachedBathroomH3CellRecord(cached!)?.rows.map((entry) => entry.id))
      .toContain(row.id);

    const secondReadIds = (await bathroomDbReadInBounds(bounds)).map(
      (entry) => entry.id,
    );
    expect(secondReadIds).toContain(row.id);
  });

  test("oversized bounds bypass H3 cell cache and write no H3 keys", async () => {
    const row = await bathroomDbCreate(-6.5, -11.6);
    createdBathroomIds.push(row.id);

    const redis = getRedisPort();
    const namespace = resolveReadCacheNamespace(process.env.NODE_ENV);
    const oversizedBounds = {
      lowerLeft: { latitude: -90, longitude: -180 },
      upperRight: { latitude: 90, longitude: 180 },
    };

    expect(
      estimateViewportH3CellCount(
        oversizedBounds,
        H3_BATHROOM_CELL_RESOLUTION,
      ),
    ).toBeGreaterThan(H3_BATHROOM_MAX_BOUNDS_CACHE_CELLS);

    const rows = await bathroomDbReadInBounds(oversizedBounds);
    expect(rows.map((entry) => entry.id)).toContain(row.id);

    const h3Cell = bathroomLatLongToH3Cell(row, H3_BATHROOM_CELL_RESOLUTION);
    const h3Key = buildBathroomH3CellCacheKey(
      namespace,
      H3_BATHROOM_CELL_RESOLUTION,
      h3Cell,
    );
    expect(await redis.getString(h3Key)).toBeNull();

    const bathroomKey = buildReadCacheKey(namespace, "bathroom", row.id);
    expect(await redis.getString(bathroomKey)).not.toBeNull();
  });
});
