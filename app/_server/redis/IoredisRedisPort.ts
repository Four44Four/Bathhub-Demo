import "server-only";

import { Redis } from "ioredis";

import { type RedisPort } from "./RedisPort";
import { buildIoredisConnectionOptions } from "./ioredisConnectionOptions";

const INCR_WITH_EXPIRE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

const REDIS_ERROR_LOG_INTERVAL_MS = 10_000;

export function createIoredisRedisPort(redisUrl: string): RedisPort {
  const client = new Redis(redisUrl, buildIoredisConnectionOptions(redisUrl));

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
