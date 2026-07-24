import { type BathroomDataPrimaryFullRow } from "../../../_shared/BathroomDataPrimary";
import { formatSupabaseError } from "../formatSupabaseError";
import { parseBathroomDataPrimaryFullRow } from "./ReadBathroomById";

export const INCREMENT_BATHROOM_RATING_RPC_NAME =
  "increment_bathroom_data_primary_rating_count" as const;

export const INCREMENT_BATHROOM_RATING_ERROR_CONTEXT =
  "Failed to increment bathroom_data_primary rating count" as const;

export const INCREMENT_BATHROOM_INVALID_ID_MESSAGE =
  "invalid bathroom id" as const;

export const INCREMENT_BATHROOM_INVALID_STARS_MESSAGE =
  "invalid rating stars" as const;

export type IncrementBathroomRatingRpcParams = {
  p_id: number;
  p_stars: number;
};

export type IncrementBathroomRatingRpcResult = {
  data: BathroomDataPrimaryFullRow | null;
  error: { message: string } | null;
};

export type IncrementBathroomRatingRpc = (
  params: IncrementBathroomRatingRpcParams,
) => Promise<IncrementBathroomRatingRpcResult>;

export function incrementBathroomRatingValidationError(
  id: number,
  stars: number,
): string | null {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return INCREMENT_BATHROOM_INVALID_ID_MESSAGE;
  }
  if (!Number.isSafeInteger(stars) || stars < 1 || stars > 5) {
    return INCREMENT_BATHROOM_INVALID_STARS_MESSAGE;
  }
  return null;
}

export function buildIncrementBathroomRatingRpcParams(
  id: number,
  stars: number,
): IncrementBathroomRatingRpcParams {
  return {
    p_id: id,
    p_stars: stars,
  };
}

export async function incrementBathroomRating(
  id: number,
  stars: number,
  rpc: IncrementBathroomRatingRpc,
): Promise<BathroomDataPrimaryFullRow> {
  const validationError = incrementBathroomRatingValidationError(id, stars);
  if (validationError !== null) {
    throw new Error(
      formatSupabaseError(INCREMENT_BATHROOM_RATING_ERROR_CONTEXT, validationError),
    );
  }

  const { data, error } = await rpc(buildIncrementBathroomRatingRpcParams(id, stars));

  if (error !== null) {
    throw new Error(
      formatSupabaseError(INCREMENT_BATHROOM_RATING_ERROR_CONTEXT, error.message),
    );
  }

  const parsed = parseBathroomDataPrimaryFullRow(data);
  if (parsed === null) {
    throw new Error(
      formatSupabaseError(
        INCREMENT_BATHROOM_RATING_ERROR_CONTEXT,
        "invalid bathroom row payload",
      ),
    );
  }

  return parsed;
}
