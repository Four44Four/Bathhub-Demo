const LOCAL_SUPABASE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export type LocalSupabaseEnv = {
  url: string;
  key: string;
};

export function requireLocalSupabaseEnv(): LocalSupabaseEnv {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (url === undefined || url.length === 0) {
    throw new Error("Missing or empty SUPABASE_URL");
  }

  if (key === undefined || key.length === 0) {
    throw new Error("Missing or empty SUPABASE_KEY");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`SUPABASE_URL is not a valid URL: ${url}`);
  }

  if (!LOCAL_SUPABASE_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `SUPABASE_URL must point at local Supabase (127.0.0.1 or localhost), got ${url}`,
    );
  }

  return { url, key };
}
