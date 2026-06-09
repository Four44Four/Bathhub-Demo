import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  type NewTestTableRow,
  type TestTableRow,
  type TestTableRowUpdate,
} from "../../_shared/TestTable";

export type { NewTestTableRow, TestTableRow, TestTableRowUpdate };

/** Env var name read for the Supabase project URL (see `getSupabaseUrl`). */
const SUPABASE_URL_ENV = "SUPABASE_URL" as const;

/** Env var name read for the Supabase API key (see `getSupabaseKey`). */
const SUPABASE_KEY_ENV = "SUPABASE_KEY" as const;

/** Test table used by this CRUD module. */
export const TEST_TABLE_NAME = "test_table" as const;

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

export async function createTestTableRow(
  row: NewTestTableRow,
): Promise<TestTableRow> {
  const { data, error } = await getSupabaseClient()
    .from(TEST_TABLE_NAME)
    .insert(row)
    .select()
    .single();

  if (error !== null) {
    throw new Error(formatSupabaseError("Failed to create test_table row", error.message));
  }

  return data;
}

export async function getTestTableRowById(id: number): Promise<TestTableRow | null> {
  const { data, error } = await getSupabaseClient()
    .from(TEST_TABLE_NAME)
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error !== null) {
    throw new Error(formatSupabaseError("Failed to read test_table row", error.message));
  }

  return data;
}

export async function getAllTestTableRows(): Promise<TestTableRow[]> {
  const { data, error } = await getSupabaseClient()
    .from(TEST_TABLE_NAME)
    .select()
    .order("id", { ascending: true });

  if (error !== null) {
    throw new Error(formatSupabaseError("Failed to list test_table rows", error.message));
  }

  return data ?? [];
}

export async function getOldestTestTableRowByUpdatedAt(): Promise<TestTableRow | null> {
  const { data, error } = await getSupabaseClient()
    .from(TEST_TABLE_NAME)
    .select()
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error !== null) {
    throw new Error(
      formatSupabaseError("Failed to read oldest test_table row", error.message),
    );
  }

  return data;
}

export async function updateTestTableRow(
  id: number,
  updates: TestTableRowUpdate,
): Promise<TestTableRow> {
  const { data, error } = await getSupabaseClient()
    .from(TEST_TABLE_NAME)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error !== null) {
    throw new Error(formatSupabaseError("Failed to update test_table row", error.message));
  }

  return data;
}

export async function deleteTestTableRow(id: number): Promise<void> {
  const { error } = await getSupabaseClient()
    .from(TEST_TABLE_NAME)
    .delete()
    .eq("id", id);

  if (error !== null) {
    throw new Error(formatSupabaseError("Failed to delete test_table row", error.message));
  }
}
