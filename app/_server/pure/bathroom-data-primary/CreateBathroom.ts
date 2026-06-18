import { type BathroomDataPrimaryRow } from "../../../_shared/BathroomDataPrimary";
import { formatSupabaseError } from "../formatSupabaseError";

/** Length of the random `temp_data` placeholder assigned on create. */
export const TEMP_DATA_LENGTH = 64;

/** Supabase RPC name used to insert a bathroom at a lat/long. */
export const CREATE_BATHROOM_RPC_NAME = "create_bathroom_data_primary_at" as const;

/** Prefix for errors raised when the create RPC fails. */
export const CREATE_BATHROOM_ERROR_CONTEXT =
  "Failed to create bathroom_data_primary row" as const;

const ALPHANUM =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export type CreateBathroomRpcParams = {
  p_latitude: number;
  p_longitude: number;
  p_temp_data: string;
};

export type CreateBathroomRpcResult = {
  data: BathroomDataPrimaryRow | null;
  error: { message: string } | null;
};

export type CreateBathroomRpc = (
  params: CreateBathroomRpcParams,
) => Promise<CreateBathroomRpcResult>;

export function isAlphanumericString(value: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(value);
}

export function randomAlphanumericString(
  length: number,
  pickIndex: (max: number) => number = (max) =>
    Math.floor(Math.random() * max),
): string {
  let value = "";
  for (let i = 0; i < length; i++) {
    value += ALPHANUM[pickIndex(ALPHANUM.length)];
  }
  return value;
}

export function generateTempData(
  pickIndex?: (max: number) => number,
): string {
  return randomAlphanumericString(TEMP_DATA_LENGTH, pickIndex);
}

export function buildCreateBathroomRpcParams(
  latitude: number,
  longitude: number,
  tempData: string,
): CreateBathroomRpcParams {
  return {
    p_latitude: latitude,
    p_longitude: longitude,
    p_temp_data: tempData,
  };
}

export async function createBathroomAt(
  latitude: number,
  longitude: number,
  rpc: CreateBathroomRpc,
  generateTempDataFn: () => string = generateTempData,
): Promise<BathroomDataPrimaryRow> {
  const { data, error } = await rpc(
    buildCreateBathroomRpcParams(
      latitude,
      longitude,
      generateTempDataFn(),
    ),
  );

  if (error !== null) {
    throw new Error(
      formatSupabaseError(CREATE_BATHROOM_ERROR_CONTEXT, error.message),
    );
  }

  return data as BathroomDataPrimaryRow;
}
