import {
  getRedisUrl,
  REDIS_URL_ENV,
} from "../app/_server/EnvironmentVariables";

const LOCAL_REDIS_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export type LocalRedisEnv = {
  url: string;
};

export function requireLocalRedis(): LocalRedisEnv {
  const url = getRedisUrl();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${REDIS_URL_ENV} is not a valid URL: ${url}`);
  }

  if (!LOCAL_REDIS_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `${REDIS_URL_ENV} must point at local Redis (127.0.0.1 or localhost), got ${url}`,
    );
  }

  return { url };
}
