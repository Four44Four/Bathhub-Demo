import {
  formatEnvVarUsabilityIssuesMessage,
  issuesFromMissingEnvVarNames,
} from "./EnvVarUsability.ts";

/** Env var name for the OpenRouteService API key (see `getOpenRouteServiceApiKey`). */
export const OPEN_ROUTE_SERVICE_API_KEY_ENV =
  "OPEN_ROUTE_SERVICE_API_KEY" as const;

/** Env var name for the Supabase project URL (see `getSupabaseUrl`). */
export const SUPABASE_URL_ENV = "SUPABASE_URL" as const;

/** Env var name for the Supabase API key (see `getSupabaseKey`). */
export const SUPABASE_KEY_ENV = "SUPABASE_KEY" as const;

/** Env var name for the Redis connection URL (see `getRedisUrl`). */
export const REDIS_URL_ENV = "REDIS_URL" as const;

export const REQUIRED_SERVER_ENV_VAR_NAMES = [
  OPEN_ROUTE_SERVICE_API_KEY_ENV,
  SUPABASE_URL_ENV,
  SUPABASE_KEY_ENV,
  REDIS_URL_ENV,
] as const;

export function getMissingRequiredEnvVars(
  env: Record<string, string | undefined>,
  requiredNames: readonly string[] = REQUIRED_SERVER_ENV_VAR_NAMES,
): string[] {
  return requiredNames.filter((name) => {
    const value = env[name];
    return value === undefined || value.length === 0;
  });
}

export function formatMissingRequiredEnvVarsMessage(
  missing: readonly string[],
): string {
  return formatEnvVarUsabilityIssuesMessage(
    issuesFromMissingEnvVarNames(missing),
  );
}
