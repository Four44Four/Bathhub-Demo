import { type BathroomDataPrimaryFullRow } from "../../../_shared/BathroomDataPrimary";
import { formatSupabaseError } from "../formatSupabaseError";
import {
  buildClearBathroomRatingRpcParams,
  type ClearBathroomRatingChange,
  type ClearBathroomRatingRpcParams,
} from "./BathroomComments";
import {
  bathroomReadByIdValidationError,
  parseBathroomDataPrimaryFullRow,
} from "./ReadBathroomById";

export const GET_OWN_BATHROOM_INTERACTION_RPC_NAME =
  "get_own_bathroom_interaction" as const;
export const CLEAR_OWN_BATHROOM_EXISTENCE_VOTE_RPC_NAME =
  "clear_own_bathroom_existence_vote" as const;
export const CLEAR_OWN_BATHROOM_RATING_RPC_NAME =
  "clear_own_bathroom_rating" as const;

export const OWN_BATHROOM_INTERACTION_ERROR_CONTEXT =
  "Failed to read bathroom interaction" as const;
export const CLEAR_BATHROOM_EXISTENCE_VOTE_ERROR_CONTEXT =
  "Failed to clear bathroom existence vote" as const;
export const CLEAR_BATHROOM_RATING_ERROR_CONTEXT =
  "Failed to clear bathroom rating" as const;

export type OwnBathroomInteraction = {
  voteForExists: boolean | null;
  voteOnCooldown: boolean;
  ratingStars: number | null;
};

export type OwnBathroomInteractionRpcParams = {
  p_id: number;
};

export type OwnBathroomInteractionRpcResult = {
  data: unknown;
  error: { message: string } | null;
};

export type OwnBathroomInteractionRpc = (
  params: OwnBathroomInteractionRpcParams,
) => Promise<OwnBathroomInteractionRpcResult>;

export type ClearOwnBathroomRpc = OwnBathroomInteractionRpc;

export type ClearOwnBathroomRatingRpc = (
  params: ClearBathroomRatingRpcParams,
) => Promise<OwnBathroomInteractionRpcResult>;

export function parseOwnBathroomInteraction(
  value: unknown,
): OwnBathroomInteraction | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const record = value as {
    vote_for_exists?: unknown;
    vote_on_cooldown?: unknown;
    rating_stars?: unknown;
  };
  const voteForExists =
    record.vote_for_exists === null || record.vote_for_exists === undefined
      ? null
      : record.vote_for_exists;
  const ratingStars =
    record.rating_stars === null || record.rating_stars === undefined
      ? null
      : record.rating_stars;
  if (voteForExists !== null && typeof voteForExists !== "boolean") {
    return null;
  }
  if (typeof record.vote_on_cooldown !== "boolean") {
    return null;
  }
  if (
    ratingStars !== null &&
    (typeof ratingStars !== "number" ||
      !Number.isInteger(ratingStars) ||
      ratingStars < 1 ||
      ratingStars > 5)
  ) {
    return null;
  }
  return {
    voteForExists,
    voteOnCooldown: record.vote_on_cooldown,
    ratingStars,
  };
}

async function mutateOwnBathroom(
  id: number,
  context: string,
  rpc: ClearOwnBathroomRpc,
): Promise<BathroomDataPrimaryFullRow> {
  const validationError = bathroomReadByIdValidationError(id);
  if (validationError !== null) {
    throw new Error(formatSupabaseError(context, validationError));
  }

  const { data, error } = await rpc({ p_id: id });
  if (error !== null) {
    throw new Error(formatSupabaseError(context, error.message));
  }

  const parsed = parseBathroomDataPrimaryFullRow(data);
  if (parsed === null) {
    throw new Error(formatSupabaseError(context, "invalid bathroom row payload"));
  }
  return parsed;
}

export async function readOwnBathroomInteraction(
  id: number,
  rpc: OwnBathroomInteractionRpc,
): Promise<OwnBathroomInteraction> {
  const validationError = bathroomReadByIdValidationError(id);
  if (validationError !== null) {
    throw new Error(
      formatSupabaseError(OWN_BATHROOM_INTERACTION_ERROR_CONTEXT, validationError),
    );
  }

  const { data, error } = await rpc({ p_id: id });
  if (error !== null) {
    throw new Error(
      formatSupabaseError(OWN_BATHROOM_INTERACTION_ERROR_CONTEXT, error.message),
    );
  }

  const parsed = parseOwnBathroomInteraction(data);
  if (parsed === null) {
    throw new Error(
      formatSupabaseError(
        OWN_BATHROOM_INTERACTION_ERROR_CONTEXT,
        "invalid bathroom interaction payload",
      ),
    );
  }
  return parsed;
}

export async function clearOwnBathroomExistenceVote(
  id: number,
  rpc: ClearOwnBathroomRpc,
): Promise<BathroomDataPrimaryFullRow> {
  return mutateOwnBathroom(id, CLEAR_BATHROOM_EXISTENCE_VOTE_ERROR_CONTEXT, rpc);
}

export async function clearOwnBathroomRating(
  id: number,
  rpc: ClearOwnBathroomRatingRpc,
  change?: ClearBathroomRatingChange | null,
): Promise<BathroomDataPrimaryFullRow> {
  const validationError = bathroomReadByIdValidationError(id);
  if (validationError !== null) {
    throw new Error(
      formatSupabaseError(CLEAR_BATHROOM_RATING_ERROR_CONTEXT, validationError),
    );
  }

  const { data, error } = await rpc(
    buildClearBathroomRatingRpcParams(id, change),
  );
  if (error !== null) {
    throw new Error(
      formatSupabaseError(CLEAR_BATHROOM_RATING_ERROR_CONTEXT, error.message),
    );
  }

  const parsed = parseBathroomDataPrimaryFullRow(data);
  if (parsed === null) {
    throw new Error(
      formatSupabaseError(
        CLEAR_BATHROOM_RATING_ERROR_CONTEXT,
        "invalid bathroom row payload",
      ),
    );
  }
  return parsed;
}
