import {
  getSupabaseKey,
  getSupabaseUrl,
  SUPABASE_URL_ENV,
} from "../app/_server/EnvironmentVariables";

const LOCAL_SUPABASE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export type LocalSupabaseEnv = {
  url: string;
  key: string;
};

export function requireLocalSupabaseEnv(): LocalSupabaseEnv {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${SUPABASE_URL_ENV} is not a valid URL: ${url}`);
  }

  if (!LOCAL_SUPABASE_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `${SUPABASE_URL_ENV} must point at local Supabase (127.0.0.1 or localhost), got ${url}`,
    );
  }

  return { url, key };
}
