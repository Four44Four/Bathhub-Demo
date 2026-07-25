export type VerifyStatus = "pending" | "verified" | "pending-deletion";

export type LatLong = {
  latitude: number;
  longitude: number;
};

export type ViewportBounds = {
  lowerLeft: LatLong;
  upperRight: LatLong;
};

export type BathroomDataPrimaryRow = {
  id: number;
  latitude: number;
  longitude: number;
  existence_value: number;
  deletion_wait_started_timestamp: string | null;
  temp_data: string;
  created_at: string;
  version: number;
};

/** Full bathroom_data_primary row including per-star rating counts. */
export type BathroomDataPrimaryFullRow = BathroomDataPrimaryRow & {
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
};

/** Client cache entry sent with viewport sync requests. */
export type BathroomClientCacheEntry = {
  id: number;
  version: number;
};

/** Bathroom payload returned in a viewport sync UPSERT response. */
export type BathroomSyncUpsert = {
  id: number;
  latitude: number;
  longitude: number;
  existence_value: number;
  deletion_wait_started_timestamp: string | null;
  version: number;
};

export type BathroomSyncResponse = {
  upserts: BathroomSyncUpsert[];
  deleteIds: number[];
};

/** Bathroom shown on the globe and stored in the local cache. */
export type BathroomViewportEntry = BathroomSyncUpsert & {
  /** Derived client-side for markers and local cache (see bathroom_db_reading.md). */
  verify_status: VerifyStatus;
};

export const BATHROOM_LOCAL_CACHE_TABLE_NAME =
  "bathroom_data_primary_cache" as const;

/** Whether a bathroom is in the pending-deletion wait period. */
export function isBathroomPendingDeletion(
  deletionWaitStartedTimestamp: string | null | undefined,
): boolean {
  return deletionWaitStartedTimestamp != null;
}

/** Derives marker/cache verify status from existence_value. */
export function deriveVerifyStatusFromExistenceValue(
  existenceValue: number,
): VerifyStatus {
  return existenceValue > 0.0 ? "verified" : "pending";
}

/** Derives marker/panel status from existence_value and deletion wait timestamp. */
export function deriveVerifyStatusFromBathroomFields(
  existenceValue: number,
  deletionWaitStartedTimestamp?: string | null,
): VerifyStatus {
  if (isBathroomPendingDeletion(deletionWaitStartedTimestamp)) {
    return "pending-deletion";
  }
  return deriveVerifyStatusFromExistenceValue(existenceValue);
}

export function bathroomSyncUpsertToViewportEntry(
  upsert: BathroomSyncUpsert,
): BathroomViewportEntry {
  return {
    ...upsert,
    verify_status: deriveVerifyStatusFromBathroomFields(
      upsert.existence_value,
      upsert.deletion_wait_started_timestamp,
    ),
  };
}

/** Maps a bathroom_data_primary row to a globe viewport/cache entry. */
export function bathroomDataPrimaryRowToViewportEntry(
  row: Pick<
    BathroomDataPrimaryRow,
    | "id"
    | "latitude"
    | "longitude"
    | "existence_value"
    | "deletion_wait_started_timestamp"
    | "version"
  >,
): BathroomViewportEntry {
  return bathroomSyncUpsertToViewportEntry({
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    existence_value: row.existence_value,
    deletion_wait_started_timestamp: row.deletion_wait_started_timestamp,
    version: row.version,
  });
}
