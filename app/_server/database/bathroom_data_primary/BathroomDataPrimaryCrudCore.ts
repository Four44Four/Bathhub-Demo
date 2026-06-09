import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  type BathroomDataPrimaryRow,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";

export type { BathroomDataPrimaryRow, ViewportBounds };

/** Env var name read for the Supabase project URL (see `getSupabaseUrl`). */
const SUPABASE_URL_ENV = "SUPABASE_URL" as const;

/** Env var name read for the Supabase API key (see `getSupabaseKey`). */
const SUPABASE_KEY_ENV = "SUPABASE_KEY" as const;

/** Bathroom table used by this CRUD module. */
export const BATHROOM_DATA_PRIMARY_TABLE_NAME = "bathroom_data_primary" as const;

const TEMP_DATA_LENGTH = 64;

const ALPHANUM =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

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

export function randomAlphanumericString(length: number): string {
  let value = "";
  for (let i = 0; i < length; i++) {
    value += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
  }
  return value;
}

export function generateTempData(): string {
  return randomAlphanumericString(TEMP_DATA_LENGTH);
}

export async function createBathroomDataPrimaryAt(
  latitude: number,
  longitude: number,
): Promise<BathroomDataPrimaryRow> {
  const { data, error } = await getSupabaseClient()
    .rpc("create_bathroom_data_primary_at", {
      p_latitude: latitude,
      p_longitude: longitude,
      p_temp_data: generateTempData(),
    })
    .single();

  if (error !== null) {
    throw new Error(
      formatSupabaseError("Failed to create bathroom_data_primary row", error.message),
    );
  }

  return data as BathroomDataPrimaryRow;
}

export async function getBathroomDataPrimaryInBounds(
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
