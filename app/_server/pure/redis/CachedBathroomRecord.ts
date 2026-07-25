import {
  type BathroomDataPrimaryFullRow,
  type BathroomDataPrimaryRow,
  type BathroomSyncUpsert,
  type VerifyStatus,
  deriveVerifyStatusFromBathroomFields,
} from "../../../_shared/BathroomDataPrimary";

export type CachedBathroomRecord = {
  id: number;
  latitude: number;
  longitude: number;
  verify_status: VerifyStatus;
  version: number;
  temp_data: string;
  created_at: string;
  existence_value?: number;
  deletion_wait_started_timestamp?: string | null;
  rating_1_count?: number;
  rating_2_count?: number;
  rating_3_count?: number;
  rating_4_count?: number;
  rating_5_count?: number;
};

function verifyStatusFromRow(
  row: Pick<
    BathroomDataPrimaryRow,
    "existence_value" | "deletion_wait_started_timestamp"
  >,
): VerifyStatus {
  return deriveVerifyStatusFromBathroomFields(
    row.existence_value,
    row.deletion_wait_started_timestamp,
  );
}

function isExistenceValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parseDeletionWaitStartedTimestamp(
  value: unknown,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return typeof value === "string" ? value : null;
}

export function parseBathroomDataPrimaryRowFromCache(
  value: unknown,
): BathroomDataPrimaryRow | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<BathroomDataPrimaryRow>;
  if (
    typeof candidate.id !== "number" ||
    typeof candidate.latitude !== "number" ||
    typeof candidate.longitude !== "number" ||
    !isExistenceValue(candidate.existence_value) ||
    typeof candidate.temp_data !== "string" ||
    typeof candidate.created_at !== "string" ||
    typeof candidate.version !== "number"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    existence_value: candidate.existence_value,
    deletion_wait_started_timestamp: parseDeletionWaitStartedTimestamp(
      candidate.deletion_wait_started_timestamp,
    ),
    temp_data: candidate.temp_data,
    created_at: candidate.created_at,
    version: candidate.version,
  };
}

export function bathroomFullRowToCachedRecord(
  row: BathroomDataPrimaryFullRow,
): CachedBathroomRecord {
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    verify_status: verifyStatusFromRow(row),
    version: row.version,
    temp_data: row.temp_data,
    created_at: row.created_at,
    existence_value: row.existence_value,
    deletion_wait_started_timestamp: row.deletion_wait_started_timestamp,
    rating_1_count: row.rating_1_count,
    rating_2_count: row.rating_2_count,
    rating_3_count: row.rating_3_count,
    rating_4_count: row.rating_4_count,
    rating_5_count: row.rating_5_count,
  };
}

export function cachedBathroomRecordToFullRow(
  record: CachedBathroomRecord,
): BathroomDataPrimaryFullRow | null {
  if (
    typeof record.rating_1_count !== "number" ||
    typeof record.rating_2_count !== "number" ||
    typeof record.rating_3_count !== "number" ||
    typeof record.rating_4_count !== "number" ||
    typeof record.rating_5_count !== "number" ||
    !isExistenceValue(record.existence_value)
  ) {
    return null;
  }

  return {
    id: record.id,
    latitude: record.latitude,
    longitude: record.longitude,
    existence_value: record.existence_value,
    deletion_wait_started_timestamp: parseDeletionWaitStartedTimestamp(
      record.deletion_wait_started_timestamp,
    ),
    temp_data: record.temp_data,
    created_at: record.created_at,
    version: record.version,
    rating_1_count: record.rating_1_count,
    rating_2_count: record.rating_2_count,
    rating_3_count: record.rating_3_count,
    rating_4_count: record.rating_4_count,
    rating_5_count: record.rating_5_count,
  };
}

export function bathroomRowToCachedRecord(
  row: BathroomDataPrimaryRow,
): CachedBathroomRecord {
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    verify_status: verifyStatusFromRow(row),
    version: row.version,
    temp_data: row.temp_data,
    created_at: row.created_at,
    existence_value: row.existence_value,
    deletion_wait_started_timestamp: row.deletion_wait_started_timestamp,
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
    verify_status: verifyStatusFromRow(row),
    version: row.version,
    temp_data: existing?.temp_data ?? "",
    created_at: existing?.created_at ?? "",
    existence_value: row.existence_value,
    deletion_wait_started_timestamp: row.deletion_wait_started_timestamp,
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
    existence_value: 0,
    deletion_wait_started_timestamp: null,
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
      candidate.verify_status !== "verified" &&
      candidate.verify_status !== "pending-deletion") ||
    typeof candidate.version !== "number" ||
    typeof candidate.temp_data !== "string" ||
    typeof candidate.created_at !== "string"
  ) {
    return null;
  }

  if (
    candidate.existence_value !== undefined &&
    !isExistenceValue(candidate.existence_value)
  ) {
    return null;
  }

  if (
    candidate.deletion_wait_started_timestamp !== undefined &&
    candidate.deletion_wait_started_timestamp !== null &&
    typeof candidate.deletion_wait_started_timestamp !== "string"
  ) {
    return null;
  }

  const optionalRatingCounts = {
    rating_1_count: candidate.rating_1_count,
    rating_2_count: candidate.rating_2_count,
    rating_3_count: candidate.rating_3_count,
    rating_4_count: candidate.rating_4_count,
    rating_5_count: candidate.rating_5_count,
  };

  for (const value of Object.values(optionalRatingCounts)) {
    if (value !== undefined && !isNonNegativeCount(value)) {
      return null;
    }
  }

  return {
    id: candidate.id,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    verify_status: candidate.verify_status,
    version: candidate.version,
    temp_data: candidate.temp_data,
    created_at: candidate.created_at,
    existence_value: candidate.existence_value,
    deletion_wait_started_timestamp: parseDeletionWaitStartedTimestamp(
      candidate.deletion_wait_started_timestamp,
    ),
    ...optionalRatingCounts,
  };
}
