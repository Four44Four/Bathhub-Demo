import { type LatLong } from "../../../_shared/BathroomDataPrimary";
import { type NearestBathroomLocation } from "../../../_shared/find-nearest-bathroom/NearestBathroomLocation";

export const FIND_NEAREST_BATHROOM_RPC_NAME =
  "get_nearest_bathroom_data_primary" as const;

export const FIND_NEAREST_BATHROOM_ERROR_CONTEXT =
  "Failed to find nearest bathroom_data_primary row" as const;

export const FIND_NEAREST_INVALID_COORDINATES_MESSAGE =
  "invalid nearest-bathroom query coordinates" as const;

export const FIND_NEAREST_INVALID_MAX_DISTANCE_MESSAGE =
  "invalid nearest-bathroom max distance" as const;

export const FIND_NEAREST_INVALID_MIN_RATING_MESSAGE =
  "invalid nearest-bathroom min rating" as const;

export type FindNearestBathroomConstraints = {
  maxDistanceM: number;
  minRating: number;
};

export type FindNearestBathroomRpcRow = NearestBathroomLocation;

export type FindNearestBathroomRpcParams = {
  p_latitude: number;
  p_longitude: number;
  p_max_distance_m: number;
  p_min_rating: number;
};

export type FindNearestBathroomRpcResult = {
  data: FindNearestBathroomRpcRow[] | null;
  error: { message: string } | null;
};

export type FindNearestBathroomRpc = (
  params: FindNearestBathroomRpcParams,
) => Promise<FindNearestBathroomRpcResult>;

export function parseFindNearestBathroomRpcRow(
  row: unknown,
): FindNearestBathroomRpcRow | null {
  if (row === null || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = r.id;
  const latitude = r.latitude;
  const longitude = r.longitude;
  if (
    typeof id !== "number" ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return null;
  }
  if (!Number.isFinite(id) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { id, latitude, longitude };
}

export function parseFindNearestBathroomRpcData(
  data: unknown,
): FindNearestBathroomRpcRow | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  return parseFindNearestBathroomRpcRow(data[0]);
}

export type NearestBathroomClientPayload = NearestBathroomLocation;

export function toNearestBathroomClientPayload(
  row: FindNearestBathroomRpcRow,
): NearestBathroomClientPayload {
  return { id: row.id, latitude: row.latitude, longitude: row.longitude };
}

export function findNearestBathroomQueryValidationError(
  location: LatLong,
  constraints: FindNearestBathroomConstraints,
): string | null {
  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    !Number.isFinite(constraints.maxDistanceM) ||
    !Number.isFinite(constraints.minRating)
  ) {
    return FIND_NEAREST_INVALID_COORDINATES_MESSAGE;
  }

  if (constraints.maxDistanceM < 0) {
    return FIND_NEAREST_INVALID_MAX_DISTANCE_MESSAGE;
  }

  if (constraints.minRating < 0 || constraints.minRating > 5) {
    return FIND_NEAREST_INVALID_MIN_RATING_MESSAGE;
  }

  return null;
}

export function buildFindNearestBathroomRpcParams(
  location: LatLong,
  constraints: FindNearestBathroomConstraints,
): FindNearestBathroomRpcParams {
  return {
    p_latitude: location.latitude,
    p_longitude: location.longitude,
    p_max_distance_m: constraints.maxDistanceM,
    p_min_rating: constraints.minRating,
  };
}
