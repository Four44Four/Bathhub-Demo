import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  type BathroomClientCacheEntry,
  type BathroomDataPrimaryFullRow,
  type BathroomDataPrimaryRow,
  type BathroomSyncResponse,
  type LatLong,
  type VerifyStatus,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";
import {
  CREATE_BATHROOM_RPC_NAME,
  createBathroomAt,
  type CreateBathroomRpc,
} from "../../pure/bathroom-data-primary/CreateBathroom";
import { formatSupabaseError } from "../../pure/formatSupabaseError";
import {
  SYNC_BATHROOM_ERROR_CONTEXT,
  SYNC_BATHROOM_RPC_NAME,
  buildSyncBathroomRpcParams,
  parseSyncBathroomRpcPayload,
} from "../../pure/bathroom-data-primary/SyncBathrooms";
import {
  GET_BATHROOM_H3_CELLS_RPC_NAME,
  buildBathroomH3CellRpcParams,
  loadBathroomRowsInBoundsViaH3Cache,
  parseBathroomH3CellRpcRows,
  type BathroomH3CellRpcRow,
} from "../../pure/bathroom-data-primary/H3BoundsCache";
import {
  FIND_NEAREST_BATHROOM_ERROR_CONTEXT,
  FIND_NEAREST_BATHROOM_RPC_NAME,
  buildFindNearestBathroomRpcParams,
  findNearestBathroomQueryValidationError,
  parseFindNearestBathroomRpcData,
  type FindNearestBathroomConstraints,
  type FindNearestBathroomRpcRow,
} from "../../pure/bathroom-data-primary/FindNearestBathroom";
import {
  READ_BATHROOM_BY_ID_RPC_NAME,
  readBathroomById,
  type ReadBathroomByIdRpc,
} from "../../pure/bathroom-data-primary/ReadBathroomById";
import {
  INCREMENT_BATHROOM_RATING_RPC_NAME,
  incrementBathroomRating,
  type IncrementBathroomRatingRpc,
} from "../../pure/bathroom-data-primary/IncrementBathroomRating";
import {
  UPDATE_BATHROOM_VERIFY_STATUS_RPC_NAME,
  updateBathroomVerifyStatus,
  type UpdateBathroomVerifyStatusRpc,
} from "../../pure/bathroom-data-primary/UpdateBathroom";
import {
  H3_BATHROOM_CELL_RESOLUTION,
  H3_BATHROOM_MAX_BOUNDS_CACHE_CELLS,
} from "../../ServerConstants";
import { getSupabaseKey, getSupabaseUrl } from "../../EnvironmentVariables";
import { getReadCache, runReadCacheSideEffect } from "../../redis/ReadCache";
import {
  bathroomLatLongToH3Cell,
  type BathroomH3CellPolygon,
} from "../../pure/geospatial/BathroomH3Cells";

export type { BathroomDataPrimaryRow, ViewportBounds };

/** Bathroom table used by this CRUD module. */
export const BATHROOM_DATA_PRIMARY_TABLE_NAME = "bathroom_data_primary" as const;

let supabaseClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client initialized from
 * {@link getSupabaseUrl} and {@link getSupabaseKey}.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient === null) {
    supabaseClient = createClient(getSupabaseUrl(), getSupabaseKey());
  }
  return supabaseClient;
}

const READ_IN_BOUNDS_INVALID_BBOX_MESSAGE = "invalid bbox coordinates" as const;

function assertFiniteViewportBounds(bounds: ViewportBounds): void {
  const { lowerLeft, upperRight } = bounds;
  if (
    !Number.isFinite(lowerLeft.latitude) ||
    !Number.isFinite(lowerLeft.longitude) ||
    !Number.isFinite(upperRight.latitude) ||
    !Number.isFinite(upperRight.longitude)
  ) {
    throw new Error(
      formatSupabaseError(
        "Failed to list bathroom_data_primary rows in bounds",
        READ_IN_BOUNDS_INVALID_BBOX_MESSAGE,
      ),
    );
  }
}

export async function createAt(
  latitude: number,
  longitude: number,
): Promise<BathroomDataPrimaryRow> {
  const client = getSupabaseClient();
  const rpc: CreateBathroomRpc = async (params) => {
    const { data, error } = await client
      .rpc(CREATE_BATHROOM_RPC_NAME, params)
      .single();
    return { data: data as BathroomDataPrimaryRow | null, error };
  };

  return createBathroomAt(latitude, longitude, rpc).then(async (row) => {
    await runReadCacheSideEffect(async () => {
      const readCache = getReadCache();
      await readCache.cacheBathroomRow(row);
      await readCache.invalidateBathroomH3Cell(
        bathroomRowToH3Cell(row),
        H3_BATHROOM_CELL_RESOLUTION,
      );
    });
    return row;
  });
}

export async function incrementRatingCount(
  id: number,
  stars: number,
): Promise<BathroomDataPrimaryFullRow> {
  const client = getSupabaseClient();
  const rpc: IncrementBathroomRatingRpc = async (params) => {
    const { data, error } = await client
      .rpc(INCREMENT_BATHROOM_RATING_RPC_NAME, params)
      .maybeSingle();
    return {
      data: data as BathroomDataPrimaryFullRow | null,
      error,
    };
  };

  return incrementBathroomRating(id, stars, rpc).then(async (row) => {
    await runReadCacheSideEffect(async () => {
      const readCache = getReadCache();
      await readCache.invalidateBathroom(id);
      await readCache.cacheBathroomFullRow(row);
      await readCache.invalidateBathroomH3Cell(
        bathroomRowToH3Cell(row),
        H3_BATHROOM_CELL_RESOLUTION,
      );
    });
    return row;
  });
}

export async function updateVerifyStatus(
  id: number,
  verifyStatus: VerifyStatus,
): Promise<BathroomDataPrimaryRow> {
  const client = getSupabaseClient();
  const rpc: UpdateBathroomVerifyStatusRpc = async (params) => {
    const { data, error } = await client
      .rpc(UPDATE_BATHROOM_VERIFY_STATUS_RPC_NAME, params)
      .single();
    return { data: data as BathroomDataPrimaryRow | null, error };
  };

  return updateBathroomVerifyStatus(id, verifyStatus, rpc).then(async (row) => {
    await runReadCacheSideEffect(async () => {
      const readCache = getReadCache();
      await readCache.invalidateBathroom(id);
      await readCache.invalidateBathroomH3Cell(
        bathroomRowToH3Cell(row),
        H3_BATHROOM_CELL_RESOLUTION,
      );
    });
    return row;
  });
}

export async function getInBounds(
  bounds: ViewportBounds,
): Promise<BathroomDataPrimaryRow[]> {
  assertFiniteViewportBounds(bounds);

  const rows = await loadBathroomRowsInBoundsViaH3Cache(
    bounds,
    createH3BoundsCacheDependencies(bounds),
  );
  await runReadCacheSideEffect(() => getReadCache().cacheBathroomRows(rows));
  return rows;
}

export async function getById(
  id: number,
): Promise<BathroomDataPrimaryFullRow | null> {
  const cached = await getReadCache().getBathroom(id);
  if (cached !== null) {
    return cached;
  }

  const row = await fetchBathroomRowByIdFromDatabase(id);
  if (row !== null) {
    await runReadCacheSideEffect(() => getReadCache().cacheBathroomFullRow(row));
  }
  return row;
}

async function fetchBathroomRowByIdFromDatabase(
  id: number,
): Promise<BathroomDataPrimaryFullRow | null> {
  const client = getSupabaseClient();
  const rpc: ReadBathroomByIdRpc = async (params) => {
    const { data, error } = await client
      .rpc(READ_BATHROOM_BY_ID_RPC_NAME, params)
      .maybeSingle();
    return {
      data: data as BathroomDataPrimaryFullRow | null,
      error,
    };
  };

  return readBathroomById(id, rpc);
}

async function fetchBathroomRowsInBoundsFromDatabase(
  bounds: ViewportBounds,
): Promise<BathroomDataPrimaryRow[]> {
  const { data, error } = await getSupabaseClient().rpc(
    "get_bathroom_data_primary_in_bbox",
    {
      p_min_longitude: bounds.lowerLeft.longitude,
      p_min_latitude: bounds.lowerLeft.latitude,
      p_max_longitude: bounds.upperRight.longitude,
      p_max_latitude: bounds.upperRight.latitude,
    },
  );

  if (error !== null) {
    throw new Error(
      formatSupabaseError(
        "Failed to list bathroom_data_primary rows in bounds",
        error.message,
      ),
    );
  }

  const rows = (data ?? []) as BathroomDataPrimaryRow[];
  return rows;
}

async function fetchBathroomRowsForH3Cells(
  cellPolygons: readonly BathroomH3CellPolygon[],
): Promise<BathroomH3CellRpcRow[]> {
  const { data, error } = await getSupabaseClient().rpc(
    GET_BATHROOM_H3_CELLS_RPC_NAME,
    buildBathroomH3CellRpcParams(cellPolygons),
  );

  if (error !== null) {
    throw new Error(
      formatSupabaseError(
        "Failed to list bathroom_data_primary rows in H3 cells",
        error.message,
      ),
    );
  }

  return parseBathroomH3CellRpcRows(data);
}

export async function findNearest(
  location: LatLong,
  constraints: FindNearestBathroomConstraints,
): Promise<FindNearestBathroomRpcRow | null> {
  const validationError = findNearestBathroomQueryValidationError(location, constraints);
  if (validationError !== null) {
    throw new Error(
      formatSupabaseError(FIND_NEAREST_BATHROOM_ERROR_CONTEXT, validationError),
    );
  }

  const { data, error } = await getSupabaseClient().rpc(
    FIND_NEAREST_BATHROOM_RPC_NAME,
    buildFindNearestBathroomRpcParams(location, constraints),
  );

  if (error !== null) {
    throw new Error(
      formatSupabaseError(FIND_NEAREST_BATHROOM_ERROR_CONTEXT, error.message),
    );
  }

  const row = parseFindNearestBathroomRpcData(data);
  if (row !== null) {
    await runReadCacheSideEffect(() =>
      getReadCache().cacheNearestBathroomLocation(row),
    );
  }
  return row;
}

export async function syncInBounds(
  bounds: ViewportBounds,
  clientCache: BathroomClientCacheEntry[],
): Promise<BathroomSyncResponse> {
  assertFiniteViewportBounds(bounds);

  // Sync must compare against authoritative database state. H3 cell cache rows can
  // be stale and would miss deleteIds when bathrooms were removed server-side.
  return syncInBoundsFromDatabase(bounds, clientCache);
}

async function syncInBoundsFromDatabase(
  bounds: ViewportBounds,
  clientCache: BathroomClientCacheEntry[],
): Promise<BathroomSyncResponse> {
  const { data, error } = await getSupabaseClient().rpc(
    SYNC_BATHROOM_RPC_NAME,
    buildSyncBathroomRpcParams(bounds, clientCache),
  );

  if (error !== null) {
    throw new Error(
      formatSupabaseError(SYNC_BATHROOM_ERROR_CONTEXT, error.message),
    );
  }

  const response = parseSyncBathroomRpcPayload(data);
  await runReadCacheSideEffect(async () => {
    const readCache = getReadCache();
    await readCache.cacheBathroomSyncUpserts(response.upserts);
    await readCache.removeBathrooms(response.deleteIds);
  });
  return response;
}

function createH3BoundsCacheDependencies(bounds: ViewportBounds) {
  return {
    resolution: H3_BATHROOM_CELL_RESOLUTION,
    maxCellCount: H3_BATHROOM_MAX_BOUNDS_CACHE_CELLS,
    readCell: (cell: string, resolution: number) =>
      getReadCache().getBathroomH3Cell(cell, resolution),
    cacheCell: (
      cell: string,
      rows: readonly BathroomDataPrimaryRow[],
      resolution: number,
    ) => getReadCache().cacheBathroomH3Cell(cell, rows, resolution),
    fetchCells: fetchBathroomRowsForH3Cells,
    fallbackFetch: () => fetchBathroomRowsInBoundsFromDatabase(bounds),
  };
}

function bathroomRowToH3Cell(row: Pick<BathroomDataPrimaryRow, "latitude" | "longitude">) {
  return bathroomLatLongToH3Cell(row, H3_BATHROOM_CELL_RESOLUTION);
}
