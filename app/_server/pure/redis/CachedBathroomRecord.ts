import {
  type BathroomDataPrimaryRow,
  type BathroomSyncUpsert,
  type VerifyStatus,
} from "../../../_shared/BathroomDataPrimary";

export type CachedBathroomRecord = {
  id: number;
  latitude: number;
  longitude: number;
  verify_status: VerifyStatus;
  version: number;
  temp_data: string;
  created_at: string;
};

export function bathroomRowToCachedRecord(
  row: BathroomDataPrimaryRow,
): CachedBathroomRecord {
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    verify_status: row.verify_status,
    version: row.version,
    temp_data: row.temp_data,
    created_at: row.created_at,
  };
}

export function bathroomSyncUpsertToCachedRecord(
  row: BathroomSyncUpsert,
  existing?: CachedBathroomRecord,
): CachedBathroomRecord {
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    verify_status: row.verify_status,
    version: row.version,
    temp_data: existing?.temp_data ?? "",
    created_at: existing?.created_at ?? "",
  };
}

export function nearestBathroomLocationToCachedRecord(row: {
  id: number;
  latitude: number;
  longitude: number;
}): CachedBathroomRecord {
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    verify_status: "pending",
    version: 0,
    temp_data: "",
    created_at: "",
  };
}

export function serializeCachedBathroomRecord(
  record: CachedBathroomRecord,
): string {
  return JSON.stringify(record);
}

export function parseCachedBathroomRecord(
  raw: string,
): CachedBathroomRecord | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (parsed === null || typeof parsed !== "object") {
    return null;
  }

  const candidate = parsed as Partial<CachedBathroomRecord>;
  if (
    typeof candidate.id !== "number" ||
    typeof candidate.latitude !== "number" ||
    typeof candidate.longitude !== "number" ||
    (candidate.verify_status !== "pending" &&
      candidate.verify_status !== "verified") ||
    typeof candidate.version !== "number" ||
    typeof candidate.temp_data !== "string" ||
    typeof candidate.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    verify_status: candidate.verify_status,
    version: candidate.version,
    temp_data: candidate.temp_data,
    created_at: candidate.created_at,
  };
}
