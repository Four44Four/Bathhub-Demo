import {
  type BathroomDataPrimaryFullRow,
  type VerifyStatus,
} from "../../../_shared/BathroomDataPrimary";
import { formatSupabaseError } from "../formatSupabaseError";

export const READ_BATHROOM_BY_ID_RPC_NAME =
  "get_bathroom_data_primary_by_id" as const;

export const READ_BATHROOM_BY_ID_ERROR_CONTEXT =
  "Failed to read bathroom_data_primary row by id" as const;

export const READ_BATHROOM_INVALID_ID_MESSAGE = "invalid bathroom id" as const;

export type ReadBathroomByIdRpcParams = {
  p_id: number;
};

export type ReadBathroomByIdRpcResult = {
  data: BathroomDataPrimaryFullRow | null;
  error: { message: string } | null;
};

export type ReadBathroomByIdRpc = (
  params: ReadBathroomByIdRpcParams,
) => Promise<ReadBathroomByIdRpcResult>;

export function bathroomReadByIdValidationError(id: number): string | null {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return READ_BATHROOM_INVALID_ID_MESSAGE;
  }
  return null;
}

export function buildReadBathroomByIdRpcParams(
  id: number,
): ReadBathroomByIdRpcParams {
  return { p_id: id };
}

function isVerifyStatus(value: unknown): value is VerifyStatus {
  return value === "pending" || value === "verified";
}

function isRatingCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Parses a full bathroom row returned by {@link READ_BATHROOM_BY_ID_RPC_NAME}. */
export function parseBathroomDataPrimaryFullRow(
  value: unknown,
): BathroomDataPrimaryFullRow | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<BathroomDataPrimaryFullRow>;
  if (
    typeof candidate.id !== "number" ||
    typeof candidate.latitude !== "number" ||
    typeof candidate.longitude !== "number" ||
    !isVerifyStatus(candidate.verify_status) ||
    typeof candidate.temp_data !== "string" ||
    typeof candidate.created_at !== "string" ||
    typeof candidate.version !== "number" ||
    !isRatingCount(candidate.rating_1_count) ||
    !isRatingCount(candidate.rating_2_count) ||
    !isRatingCount(candidate.rating_3_count) ||
    !isRatingCount(candidate.rating_4_count) ||
    !isRatingCount(candidate.rating_5_count)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    verify_status: candidate.verify_status,
    temp_data: candidate.temp_data,
    created_at: candidate.created_at,
    version: candidate.version,
    rating_1_count: candidate.rating_1_count,
    rating_2_count: candidate.rating_2_count,
    rating_3_count: candidate.rating_3_count,
    rating_4_count: candidate.rating_4_count,
    rating_5_count: candidate.rating_5_count,
  };
}

export async function readBathroomById(
  id: number,
  rpc: ReadBathroomByIdRpc,
): Promise<BathroomDataPrimaryFullRow | null> {
  const validationError = bathroomReadByIdValidationError(id);
  if (validationError !== null) {
    throw new Error(
      formatSupabaseError(READ_BATHROOM_BY_ID_ERROR_CONTEXT, validationError),
    );
  }

  const { data, error } = await rpc(buildReadBathroomByIdRpcParams(id));

  if (error !== null) {
    throw new Error(
      formatSupabaseError(READ_BATHROOM_BY_ID_ERROR_CONTEXT, error.message),
    );
  }

  if (data === null) {
    return null;
  }

  const parsed = parseBathroomDataPrimaryFullRow(data);
  if (parsed === null) {
    throw new Error(
      formatSupabaseError(
        READ_BATHROOM_BY_ID_ERROR_CONTEXT,
        "invalid bathroom row payload",
      ),
    );
  }

  return parsed;
}
