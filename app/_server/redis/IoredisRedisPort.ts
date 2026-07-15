import { EventEmitter } from "node:events";
import "server-only";

import { Redis } from "ioredis";

import { REDIS_MAX_MEMORY_EVICTION_POLICY } from "../pure/redis/RedisConstants";
import { type RedisPort } from "./RedisPort";
import {
  REDIS_ERROR_LOG_INTERVAL_MS,
} from "./RedisConfig";
import { buildIoredisConnectionOptions } from "./ioredisConnectionOptions";

const INCR_WITH_EXPIRE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

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

  (client as unknown as EventEmitter).once("ready", () => {
    void ensureMaxMemoryEvictionPolicy(client);
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
    async getString(key: string): Promise<string | null> {
      return client.get(key);
    },
    async setStringWithExpiry(
      key: string,
      value: string,
      expirySeconds: number,
    ): Promise<void> {
      await client.set(key, value, "EX", expirySeconds);
    },
    async deleteKey(key: string): Promise<void> {
      await client.del(key);
    },
    async disconnect(): Promise<void> {
      await client.quit();
    },
  };
}

async function ensureMaxMemoryEvictionPolicy(client: Redis): Promise<void> {
  try {
    await client.call(
      "CONFIG",
      "SET",
      "maxmemory-policy",
      REDIS_MAX_MEMORY_EVICTION_POLICY,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      "[redis] failed to set maxmemory-policy:",
      message,
    );
  }
}
