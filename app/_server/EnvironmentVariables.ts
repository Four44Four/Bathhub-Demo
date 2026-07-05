import "server-only";

import {
  OPEN_ROUTE_SERVICE_API_KEY_ENV,
  REDIS_URL_ENV,
  SUPABASE_KEY_ENV,
  SUPABASE_URL_ENV,
} from "./pure/RequiredEnvVars";

export {
  OPEN_ROUTE_SERVICE_API_KEY_ENV,
  REDIS_URL_ENV,
  SUPABASE_KEY_ENV,
  SUPABASE_URL_ENV,
} from "./pure/RequiredEnvVars";

function requireEnvVar(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing or empty environment variable ${name}`);
  }
  return value;
}

export function getOpenRouteServiceApiKey(): string {
  return requireEnvVar(OPEN_ROUTE_SERVICE_API_KEY_ENV);
}

export function getSupabaseUrl(): string {
  return requireEnvVar(SUPABASE_URL_ENV);
}

export function getSupabaseKey(): string {
  return requireEnvVar(SUPABASE_KEY_ENV);
}

export function getRedisUrl(): string {
  return requireEnvVar(REDIS_URL_ENV);
}
