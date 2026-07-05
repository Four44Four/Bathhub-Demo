/** Shared `ioredis` client options derived from a Redis connection URL. */
export function buildIoredisConnectionOptions(redisUrl: string) {
  const parsed = new URL(redisUrl);
  const options: {
    maxRetriesPerRequest: number;
    enableReadyCheck: boolean;
    tls?: { servername: string };
  } = {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
  };

  if (parsed.protocol === "rediss:") {
    options.tls = { servername: parsed.hostname };
  }

  return options;
}
