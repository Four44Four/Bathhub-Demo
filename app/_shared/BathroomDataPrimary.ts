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
  verify_status: VerifyStatus;
  temp_data: string;
  created_at: string;
  version: number;
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
  verify_status: VerifyStatus;
  version: number;
};

export type BathroomSyncResponse = {
  upserts: BathroomSyncUpsert[];
  deleteIds: number[];
};

/** Bathroom shown on the globe and stored in the local cache. */
export type BathroomViewportEntry = BathroomSyncUpsert;

export const BATHROOM_LOCAL_CACHE_TABLE_NAME =
  "bathroom_data_primary_cache" as const;
