/** Shared `ioredis` client options derived from a Redis connection URL. */
import { REDIS_IOREDIS_CLIENT_DEFAULTS } from "./RedisConfig";

export function buildIoredisConnectionOptions(redisUrl: string) {
  const parsed = new URL(redisUrl);
  const options: {
    maxRetriesPerRequest: number;
    enableReadyCheck: boolean;
    tls?: { servername: string };
  } = {
    ...REDIS_IOREDIS_CLIENT_DEFAULTS,
  };

  if (parsed.protocol === "rediss:") {
    options.tls = { servername: parsed.hostname };
  }

  return options;
}
