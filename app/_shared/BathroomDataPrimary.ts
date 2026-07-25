export type VerifyStatus = "pending" | "verified";

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
  exists_vote_count: number;
  not_exists_vote_count: number;
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
  exists_vote_count: number;
  not_exists_vote_count: number;
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

/** Derives marker/cache verify status from existence vote counts. */
export function deriveVerifyStatusFromExistenceVotes(
  existsVoteCount: number,
  notExistsVoteCount: number,
): VerifyStatus {
  return existsVoteCount > notExistsVoteCount ? "verified" : "pending";
}

export function bathroomSyncUpsertToViewportEntry(
  upsert: BathroomSyncUpsert,
): BathroomViewportEntry {
  return {
    ...upsert,
    verify_status: deriveVerifyStatusFromExistenceVotes(
      upsert.exists_vote_count,
      upsert.not_exists_vote_count,
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
    | "exists_vote_count"
    | "not_exists_vote_count"
    | "version"
  >,
): BathroomViewportEntry {
  return bathroomSyncUpsertToViewportEntry({
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    exists_vote_count: row.exists_vote_count,
    not_exists_vote_count: row.not_exists_vote_count,
    version: row.version,
  });
}
