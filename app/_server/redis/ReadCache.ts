import "server-only";

import {
  type BathroomDataPrimaryRow,
  type BathroomSyncUpsert,
} from "../../_shared/BathroomDataPrimary";
import { READ_CACHE_TTL_SECS } from "../ServerConstants";
import {
  bathroomRowToCachedRecord,
  bathroomSyncUpsertToCachedRecord,
  nearestBathroomLocationToCachedRecord,
  parseCachedBathroomRecord,
  serializeCachedBathroomRecord,
} from "../pure/redis/CachedBathroomRecord";
import {
  parseCachedBathroomH3CellRecord,
  serializeCachedBathroomH3CellRecord,
} from "../pure/redis/CachedBathroomH3CellRecord";
import { bathroomLatLongToH3Cell } from "../pure/geospatial/BathroomH3Cells";
import {
  buildBathroomH3CellCacheKey,
  buildReadCacheKey,
  resolveReadCacheNamespace,
  type ReadCacheNamespace,
} from "../pure/redis/RedisConstants";
import { H3_BATHROOM_CELL_RESOLUTION } from "../ServerConstants";
import { getRedisPort } from "./getRedisPort";
import { type RedisPort } from "./RedisPort";

export type ReadCachePort = {
  getBathroomH3Cell(
    cell: string,
    resolution: number,
  ): Promise<BathroomDataPrimaryRow[] | null>;
  cacheBathroomH3Cell(
    cell: string,
    rows: readonly BathroomDataPrimaryRow[],
    resolution: number,
  ): Promise<void>;
  cacheBathroomRow(row: BathroomDataPrimaryRow): Promise<void>;
  cacheBathroomRows(rows: readonly BathroomDataPrimaryRow[]): Promise<void>;
  cacheBathroomSyncUpserts(rows: readonly BathroomSyncUpsert[]): Promise<void>;
  cacheNearestBathroomLocation(row: {
    id: number;
    latitude: number;
    longitude: number;
  }): Promise<void>;
  invalidateBathroomH3Cell(cell: string, resolution: number): Promise<void>;
  invalidateBathroom(id: number): Promise<void>;
  removeBathroom(id: number): Promise<void>;
  removeBathrooms(ids: readonly number[]): Promise<void>;
};

export type ReadCacheConfig = {
  namespace: ReadCacheNamespace;
  ttlSecs: number;
};

export type ReadCacheDependencies = {
  redis: RedisPort;
  config: ReadCacheConfig;
};

declare global {
  var __bathhubReadCachePort: ReadCachePort | undefined;
}

function bathroomCacheKey(config: ReadCacheConfig, id: number): string {
  return buildReadCacheKey(config.namespace, "bathroom", id);
}

function bathroomH3CellCacheKey(
  config: ReadCacheConfig,
  cell: string,
  resolution: number,
): string {
  return buildBathroomH3CellCacheKey(config.namespace, resolution, cell);
}

async function writeBathroomCacheEntry(
  deps: ReadCacheDependencies,
  id: number,
  serialized: string,
): Promise<void> {
  await deps.redis.setStringWithExpiry(
    bathroomCacheKey(deps.config, id),
    serialized,
    deps.config.ttlSecs,
  );
}

async function invalidateCachedBathroomH3CellForId(
  deps: ReadCacheDependencies,
  id: number,
): Promise<void> {
  const key = bathroomCacheKey(deps.config, id);
  const raw = await deps.redis.getString(key);
  await deps.redis.deleteKey(key);
  if (raw === null) {
    return;
  }

  const record = parseCachedBathroomRecord(raw);
  if (record === null) {
    return;
  }

  await deps.redis.deleteKey(
    bathroomH3CellCacheKey(
      deps.config,
      bathroomLatLongToH3Cell(record, H3_BATHROOM_CELL_RESOLUTION),
      H3_BATHROOM_CELL_RESOLUTION,
    ),
  );
}

export function createReadCache(deps: ReadCacheDependencies): ReadCachePort {
  async function cacheBathroomRow(row: BathroomDataPrimaryRow): Promise<void> {
    await writeBathroomCacheEntry(
      deps,
      row.id,
      serializeCachedBathroomRecord(bathroomRowToCachedRecord(row)),
    );
  }

  return {
    async getBathroomH3Cell(cell: string, resolution: number) {
      const key = bathroomH3CellCacheKey(deps.config, cell, resolution);
      const raw = await deps.redis.getString(key);
      if (raw === null) {
        return null;
      }

      const parsed = parseCachedBathroomH3CellRecord(raw);
      if (
        parsed === null ||
        parsed.cell !== cell ||
        parsed.resolution !== resolution
      ) {
        await deps.redis.deleteKey(key);
        return null;
      }
      return parsed.rows;
    },
    async cacheBathroomH3Cell(
      cell: string,
      rows: readonly BathroomDataPrimaryRow[],
      resolution: number,
    ) {
      await deps.redis.setStringWithExpiry(
        bathroomH3CellCacheKey(deps.config, cell, resolution),
        serializeCachedBathroomH3CellRecord({
          resolution,
          cell,
          rows: rows.map((row) => bathroomRowToCachedRecord(row)),
        }),
        deps.config.ttlSecs,
      );
    },
    cacheBathroomRow,
    async cacheBathroomRows(rows: readonly BathroomDataPrimaryRow[]) {
      await Promise.all(rows.map((row) => cacheBathroomRow(row)));
    },
    async cacheBathroomSyncUpserts(rows: readonly BathroomSyncUpsert[]) {
      await Promise.all(
        rows.map(async (row) => {
          await writeBathroomCacheEntry(
            deps,
            row.id,
            serializeCachedBathroomRecord(
              bathroomSyncUpsertToCachedRecord(row),
            ),
          );
        }),
      );
    },
    async cacheNearestBathroomLocation(row: {
      id: number;
      latitude: number;
      longitude: number;
    }) {
      await writeBathroomCacheEntry(
        deps,
        row.id,
        serializeCachedBathroomRecord(
          nearestBathroomLocationToCachedRecord(row),
        ),
      );
    },
    async invalidateBathroomH3Cell(
      cell: string,
      resolution: number,
    ): Promise<void> {
      await deps.redis.deleteKey(
        bathroomH3CellCacheKey(deps.config, cell, resolution),
      );
    },
    async invalidateBathroom(id: number): Promise<void> {
      await deps.redis.deleteKey(bathroomCacheKey(deps.config, id));
    },
    async removeBathroom(id: number): Promise<void> {
      await invalidateCachedBathroomH3CellForId(deps, id);
    },
    async removeBathrooms(ids: readonly number[]) {
      await Promise.all(ids.map((id) => invalidateCachedBathroomH3CellForId(deps, id)));
    },
  };
}

export function createDefaultReadCacheConfig(): ReadCacheConfig {
  return {
    namespace: resolveReadCacheNamespace(process.env.NODE_ENV),
    ttlSecs: READ_CACHE_TTL_SECS,
  };
}

/** Returns a process-wide read cache backed by {@link getRedisPort}. */
export function getReadCache(): ReadCachePort {
  if (global.__bathhubReadCachePort !== undefined) {
    return global.__bathhubReadCachePort;
  }

  const port = createReadCache({
    redis: getRedisPort(),
    config: createDefaultReadCacheConfig(),
  });

  if (process.env.NODE_ENV !== "production") {
    global.__bathhubReadCachePort = port;
  }

  return port;
}

/** Best-effort read-cache side effects; never throws to callers. */
export async function runReadCacheSideEffect(
  operation: () => Promise<void>,
): Promise<void> {
  try {
    await operation();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[read-cache] side effect failed:", message);
  }
}
