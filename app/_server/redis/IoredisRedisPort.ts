import "server-only";

import { Redis } from "ioredis";

import { type RedisPort } from "./RedisPort";

const INCR_WITH_EXPIRE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

const REDIS_ERROR_LOG_INTERVAL_MS = 10_000;

function buildIoredisOptions(redisUrl: string) {
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

export function createIoredisRedisPort(redisUrl: string): RedisPort {
  const client = new Redis(redisUrl, buildIoredisOptions(redisUrl));

  let lastErrorLoggedAt = 0;
  client.on("error", (error: Error) => {
    const now = Date.now();
    if (now - lastErrorLoggedAt < REDIS_ERROR_LOG_INTERVAL_MS) {
      return;
    }
    lastErrorLoggedAt = now;
    console.error("[redis] connection error:", error.message);
  });

  return {
    async incrementWithExpiry(
      key: string,
      expirySeconds: number,
    ): Promise<number> {
      const result = await client.eval(
        INCR_WITH_EXPIRE_SCRIPT,
        1,
        key,
        expirySeconds,
      );
      return Number(result);
    },
    async deleteKey(key: string): Promise<void> {
      await client.del(key);
    },
    async disconnect(): Promise<void> {
      await client.quit();
    },
  };
}
