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

export type LocalSupabaseAdminEnv = LocalSupabaseEnv & {
  serviceRoleKey: string;
};

function readJwtRole(jwt: string): string | null {
  const payload = jwt.split(".")[1];
  if (payload === undefined) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { role?: unknown };
    return typeof parsed.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}

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

export function requireLocalSupabaseAdminEnv(): LocalSupabaseAdminEnv {
  const env = requireLocalSupabaseEnv();
  const serviceRoleKey = process.env.SERVICE_ROLE_KEY;
  if (serviceRoleKey === undefined || serviceRoleKey.length === 0) {
    throw new Error("SERVICE_ROLE_KEY is required for local Supabase fixture mutation");
  }
  if (serviceRoleKey === env.key) {
    throw new Error("SERVICE_ROLE_KEY must not be the local Supabase anonymous key");
  }
  if (readJwtRole(serviceRoleKey) !== "service_role") {
    throw new Error("SERVICE_ROLE_KEY must be a JWT with role=service_role");
  }

  return { ...env, serviceRoleKey };
}
