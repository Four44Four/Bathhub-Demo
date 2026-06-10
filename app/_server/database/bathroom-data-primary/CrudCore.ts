import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  type BathroomDataPrimaryRow,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";
import {
  CREATE_BATHROOM_RPC_NAME,
  createBathroomAt,
  type CreateBathroomRpc,
} from "../../pure/bathroom-data-primary/CreateBathroom";

export type { BathroomDataPrimaryRow, ViewportBounds };

/** Env var name read for the Supabase project URL (see `getSupabaseUrl`). */
const SUPABASE_URL_ENV = "SUPABASE_URL" as const;

/** Env var name read for the Supabase API key (see `getSupabaseKey`). */
const SUPABASE_KEY_ENV = "SUPABASE_KEY" as const;

/** Bathroom table used by this CRUD module. */
export const BATHROOM_DATA_PRIMARY_TABLE_NAME = "bathroom_data_primary" as const;

function getSupabaseUrl(): string {
  const url = process.env[SUPABASE_URL_ENV];
  if (url === undefined || url.length === 0) {
    throw new Error(`Missing or empty environment variable ${SUPABASE_URL_ENV}`);
  }
  return url;
}

function getSupabaseKey(): string {
  const key = process.env[SUPABASE_KEY_ENV];
  if (key === undefined || key.length === 0) {
    throw new Error(`Missing or empty environment variable ${SUPABASE_KEY_ENV}`);
  }
  return key;
}

let supabaseClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client initialized from
 * `process.env.SUPABASE_URL` and `process.env.SUPABASE_KEY`.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient === null) {
    supabaseClient = createClient(getSupabaseUrl(), getSupabaseKey());
  }
  return supabaseClient;
}

function formatSupabaseError(context: string, message: string): string {
  return `${context}: ${message}`;
}

export async function createAt(
  latitude: number,
  longitude: number,
): Promise<BathroomDataPrimaryRow> {
  const client = getSupabaseClient();
  const rpc: CreateBathroomRpc = async (params) => {
    const { data, error } = await client
      .rpc(CREATE_BATHROOM_RPC_NAME, params)
      .single();
    return { data: data as BathroomDataPrimaryRow | null, error };
  };

  return createBathroomAt(latitude, longitude, rpc);
}

export async function getInBounds(
  bounds: ViewportBounds,
): Promise<BathroomDataPrimaryRow[]> {
  const { data, error } = await getSupabaseClient().rpc(
    "get_bathroom_data_primary_in_bbox",
    {
      p_min_longitude: bounds.lowerLeft.longitude,
      p_min_latitude: bounds.lowerLeft.latitude,
      p_max_longitude: bounds.upperRight.longitude,
      p_max_latitude: bounds.upperRight.latitude,
    },
  );

  if (error !== null) {
    throw new Error(
      formatSupabaseError(
        "Failed to list bathroom_data_primary rows in bounds",
        error.message,
      ),
    );
  }

  return (data ?? []) as BathroomDataPrimaryRow[];
}
