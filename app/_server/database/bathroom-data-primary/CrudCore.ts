import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  type BathroomDataPrimaryRow,
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
  type BathroomClientCacheEntry,
  type BathroomSyncResponse,
} from "../../../_shared/BathroomDataPrimary";
import {
  SYNC_BATHROOM_ERROR_CONTEXT,
  SYNC_BATHROOM_RPC_NAME,
  buildSyncBathroomRpcParams,
  parseSyncBathroomRpcPayload,
} from "../../pure/bathroom-data-primary/SyncBathrooms";
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
  UPDATE_BATHROOM_VERIFY_STATUS_RPC_NAME,
  updateBathroomVerifyStatus,
  type UpdateBathroomVerifyStatusRpc,
} from "../../pure/bathroom-data-primary/UpdateBathroom";
import { type LatLong } from "../../../_shared/BathroomDataPrimary";
import { getSupabaseKey, getSupabaseUrl } from "../../EnvironmentVariables";

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

  return createBathroomAt(latitude, longitude, rpc);
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

  return updateBathroomVerifyStatus(id, verifyStatus, rpc);
}

export async function getInBounds(
  bounds: ViewportBounds,
): Promise<BathroomDataPrimaryRow[]> {
  assertFiniteViewportBounds(bounds);

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

  return (data ?? []) as BathroomDataPrimaryRow[];
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

  return parseFindNearestBathroomRpcData(data);
}

export async function syncInBounds(
  bounds: ViewportBounds,
  clientCache: BathroomClientCacheEntry[],
): Promise<BathroomSyncResponse> {
  assertFiniteViewportBounds(bounds);

  const { data, error } = await getSupabaseClient().rpc(
    SYNC_BATHROOM_RPC_NAME,
    buildSyncBathroomRpcParams(bounds, clientCache),
  );

  if (error !== null) {
    throw new Error(
      formatSupabaseError(SYNC_BATHROOM_ERROR_CONTEXT, error.message),
    );
  }

  return parseSyncBathroomRpcPayload(data);
}
