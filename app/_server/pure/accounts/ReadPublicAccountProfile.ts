import {
  publicAccountProfileFromRow,
  type PublicAccountProfile,
} from "../../../_shared/accounts/PublicAccountProfile";
import { formatSupabaseError } from "../formatSupabaseError";

export const GET_ACCOUNT_PROFILE_RPC_NAME = "get_account_profile" as const;

export const GET_ACCOUNT_PROFILE_ERROR_CONTEXT =
  "Failed to read account profile" as const;

export const GET_ACCOUNT_PROFILE_INVALID_ID_MESSAGE =
  "invalid account id" as const;

export type GetAccountProfileRpcParams = {
  p_id: string;
};

export type GetAccountProfileRpcResult = {
  data: unknown;
  error: { message: string } | null;
};

export type GetAccountProfileRpc = (
  params: GetAccountProfileRpcParams,
) => Promise<GetAccountProfileRpcResult>;

export function getAccountProfileValidationError(
  accountId: string,
): string | null {
  if (accountId.trim().length === 0) {
    return GET_ACCOUNT_PROFILE_INVALID_ID_MESSAGE;
  }
  return null;
}

export async function readPublicAccountProfile(
  accountId: string,
  rpc: GetAccountProfileRpc,
): Promise<PublicAccountProfile> {
  const validationError = getAccountProfileValidationError(accountId);
  if (validationError !== null) {
    throw new Error(
      formatSupabaseError(GET_ACCOUNT_PROFILE_ERROR_CONTEXT, validationError),
    );
  }

  const { data, error } = await rpc({ p_id: accountId });
  if (error !== null) {
    throw new Error(
      formatSupabaseError(GET_ACCOUNT_PROFILE_ERROR_CONTEXT, error.message),
    );
  }

  const parsed = publicAccountProfileFromRow(
    Array.isArray(data) ? data[0] : data,
  );
  if (parsed === null) {
    throw new Error(
      formatSupabaseError(
        GET_ACCOUNT_PROFILE_ERROR_CONTEXT,
        "invalid account profile payload",
      ),
    );
  }
  return parsed;
}
