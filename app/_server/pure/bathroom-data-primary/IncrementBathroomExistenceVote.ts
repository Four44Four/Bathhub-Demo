import { type BathroomDataPrimaryFullRow } from "../../../_shared/BathroomDataPrimary";
import { formatSupabaseError } from "../formatSupabaseError";
import { parseBathroomDataPrimaryFullRow } from "./ReadBathroomById";

export const INCREMENT_BATHROOM_EXISTENCE_VOTE_RPC_NAME =
  "increment_bathroom_data_primary_existence_vote_count" as const;

export const INCREMENT_BATHROOM_EXISTENCE_VOTE_ERROR_CONTEXT =
  "Failed to increment bathroom_data_primary existence vote count" as const;

export const INCREMENT_BATHROOM_EXISTENCE_VOTE_INVALID_ID_MESSAGE =
  "invalid bathroom id" as const;

export type BathroomExistenceVoteSide = "exists" | "not_exists";

export type IncrementBathroomExistenceVoteRpcParams = {
  p_id: number;
  p_vote_for_exists: boolean;
};

export type IncrementBathroomExistenceVoteRpcResult = {
  data: BathroomDataPrimaryFullRow | null;
  error: { message: string } | null;
};

export type IncrementBathroomExistenceVoteRpc = (
  params: IncrementBathroomExistenceVoteRpcParams,
) => Promise<IncrementBathroomExistenceVoteRpcResult>;

export function incrementBathroomExistenceVoteValidationError(
  id: number,
): string | null {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return INCREMENT_BATHROOM_EXISTENCE_VOTE_INVALID_ID_MESSAGE;
  }
  return null;
}

export function bathroomExistenceVoteSideToRpcFlag(
  side: BathroomExistenceVoteSide,
): boolean {
  return side === "exists";
}

export function buildIncrementBathroomExistenceVoteRpcParams(
  id: number,
  side: BathroomExistenceVoteSide,
): IncrementBathroomExistenceVoteRpcParams {
  return {
    p_id: id,
    p_vote_for_exists: bathroomExistenceVoteSideToRpcFlag(side),
  };
}

export async function incrementBathroomExistenceVote(
  id: number,
  side: BathroomExistenceVoteSide,
  rpc: IncrementBathroomExistenceVoteRpc,
): Promise<BathroomDataPrimaryFullRow> {
  const validationError = incrementBathroomExistenceVoteValidationError(id);
  if (validationError !== null) {
    throw new Error(
      formatSupabaseError(
        INCREMENT_BATHROOM_EXISTENCE_VOTE_ERROR_CONTEXT,
        validationError,
      ),
    );
  }

  const { data, error } = await rpc(
    buildIncrementBathroomExistenceVoteRpcParams(id, side),
  );

  if (error !== null) {
    throw new Error(
      formatSupabaseError(
        INCREMENT_BATHROOM_EXISTENCE_VOTE_ERROR_CONTEXT,
        error.message,
      ),
    );
  }

  const parsed = parseBathroomDataPrimaryFullRow(data);
  if (parsed === null) {
    throw new Error(
      formatSupabaseError(
        INCREMENT_BATHROOM_EXISTENCE_VOTE_ERROR_CONTEXT,
        "invalid bathroom row payload",
      ),
    );
  }

  return parsed;
}
