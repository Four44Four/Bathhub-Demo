import {
  type BathroomClientCacheEntry,
  type BathroomSyncResponse,
  type BathroomSyncUpsert,
  type VerifyStatus,
} from "../../../_shared/BathroomDataPrimary";

export const SYNC_BATHROOM_RPC_NAME =
  "sync_bathroom_data_primary_in_bbox" as const;

export const SYNC_BATHROOM_ERROR_CONTEXT =
  "Failed to sync bathroom_data_primary rows in bounds" as const;

export type BathroomRemoteRowSummary = {
  id: number;
  version: number;
  latitude: number;
  longitude: number;
  verify_status: VerifyStatus;
};

export type SyncBathroomRpcParams = {
  p_min_longitude: number;
  p_min_latitude: number;
  p_max_longitude: number;
  p_max_latitude: number;
  p_client_cache: BathroomClientCacheEntry[];
};

export type SyncBathroomRpcResult = {
  data: BathroomSyncResponse | null;
  error: { message: string } | null;
};

export type SyncBathroomRpc = (
  params: SyncBathroomRpcParams,
) => Promise<SyncBathroomRpcResult>;

export function buildSyncBathroomRpcParams(
  bounds: {
    lowerLeft: { latitude: number; longitude: number };
    upperRight: { latitude: number; longitude: number };
  },
  clientCache: BathroomClientCacheEntry[],
): SyncBathroomRpcParams {
  return {
    p_min_longitude: bounds.lowerLeft.longitude,
    p_min_latitude: bounds.lowerLeft.latitude,
    p_max_longitude: bounds.upperRight.longitude,
    p_max_latitude: bounds.upperRight.latitude,
    p_client_cache: clientCache,
  };
}

/** Pure diff used by tests; mirrors the sync RPC semantics. */
export function computeBathroomSyncDiff(
  remoteRows: BathroomRemoteRowSummary[],
  clientCache: BathroomClientCacheEntry[],
): BathroomSyncResponse {
  const clientById = new Map(
    clientCache.map((entry) => [entry.id, entry.version] as const),
  );
  const remoteIds = new Set(remoteRows.map((row) => row.id));

  const upserts: BathroomSyncUpsert[] = [];
  for (const row of remoteRows) {
    const cachedVersion = clientById.get(row.id);
    if (cachedVersion === undefined || cachedVersion < row.version) {
      upserts.push({
        id: row.id,
        latitude: row.latitude,
        longitude: row.longitude,
        verify_status: row.verify_status,
        version: row.version,
      });
    }
  }

  const deleteIds: number[] = [];
  for (const entry of clientCache) {
    if (!remoteIds.has(entry.id)) {
      deleteIds.push(entry.id);
    }
  }

  return { upserts, deleteIds };
}

export function parseSyncBathroomRpcPayload(
  payload: unknown,
): BathroomSyncResponse {
  if (payload === null || typeof payload !== "object") {
    return { upserts: [], deleteIds: [] };
  }

  const record = payload as {
    upserts?: unknown;
    delete_ids?: unknown;
  };

  const upserts: BathroomSyncUpsert[] = [];
  if (Array.isArray(record.upserts)) {
    for (const item of record.upserts) {
      if (item === null || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (
        typeof row.id !== "number" ||
        typeof row.latitude !== "number" ||
        typeof row.longitude !== "number" ||
        typeof row.version !== "number" ||
        (row.verify_status !== "pending" && row.verify_status !== "verified")
      ) {
        continue;
      }
      upserts.push({
        id: row.id,
        latitude: row.latitude,
        longitude: row.longitude,
        verify_status: row.verify_status,
        version: row.version,
      });
    }
  }

  const deleteIds: number[] = [];
  if (Array.isArray(record.delete_ids)) {
    for (const id of record.delete_ids) {
      if (typeof id === "number" && Number.isFinite(id)) {
        deleteIds.push(id);
      }
    }
  }

  return { upserts, deleteIds };
}
