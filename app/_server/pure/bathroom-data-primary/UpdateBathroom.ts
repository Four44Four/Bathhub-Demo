import {
  type BathroomDataPrimaryRow,
  type VerifyStatus,
} from "../../../_shared/BathroomDataPrimary";
import { formatSupabaseError } from "../formatSupabaseError";

export const UPDATE_BATHROOM_VERIFY_STATUS_RPC_NAME =
  "update_bathroom_data_primary_verify_status" as const;

export const UPDATE_BATHROOM_ERROR_CONTEXT =
  "Failed to update bathroom_data_primary row" as const;

export const UPDATE_BATHROOM_INVALID_ID_MESSAGE =
  "invalid bathroom id" as const;

export const UPDATE_BATHROOM_INVALID_VERIFY_STATUS_MESSAGE =
  "invalid bathroom verify_status" as const;

export type UpdateBathroomVerifyStatusRpcParams = {
  p_id: number;
  p_verify_status: VerifyStatus;
};

export type UpdateBathroomVerifyStatusRpcResult = {
  data: BathroomDataPrimaryRow | null;
  error: { message: string } | null;
};

export type UpdateBathroomVerifyStatusRpc = (
  params: UpdateBathroomVerifyStatusRpcParams,
) => Promise<UpdateBathroomVerifyStatusRpcResult>;

export function isVerifyStatus(value: unknown): value is VerifyStatus {
  return value === "pending" || value === "verified";
}

export function bathroomUpdateValidationError(
  id: number,
  verifyStatus: VerifyStatus,
): string | null {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return UPDATE_BATHROOM_INVALID_ID_MESSAGE;
  }
  if (!isVerifyStatus(verifyStatus)) {
    return UPDATE_BATHROOM_INVALID_VERIFY_STATUS_MESSAGE;
  }
  return null;
}

export function buildUpdateBathroomVerifyStatusRpcParams(
  id: number,
  verifyStatus: VerifyStatus,
): UpdateBathroomVerifyStatusRpcParams {
  return {
    p_id: id,
    p_verify_status: verifyStatus,
  };
}

export async function updateBathroomVerifyStatus(
  id: number,
  verifyStatus: VerifyStatus,
  rpc: UpdateBathroomVerifyStatusRpc,
): Promise<BathroomDataPrimaryRow> {
  const validationError = bathroomUpdateValidationError(id, verifyStatus);
  if (validationError !== null) {
    throw new Error(
      formatSupabaseError(UPDATE_BATHROOM_ERROR_CONTEXT, validationError),
    );
  }

  const { data, error } = await rpc(
    buildUpdateBathroomVerifyStatusRpcParams(id, verifyStatus),
  );

  if (error !== null) {
    throw new Error(
      formatSupabaseError(UPDATE_BATHROOM_ERROR_CONTEXT, error.message),
    );
  }

  return data as BathroomDataPrimaryRow;
}
