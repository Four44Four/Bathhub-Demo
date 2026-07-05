import "server-only";

import { REDIS_URL_ENV } from "../ServerConstants";
import { createIoredisRedisPort } from "./IoredisRedisPort";
import { type RedisPort } from "./RedisPort";

declare global {
  var __bathhubRedisPort: RedisPort | undefined;
}

function getRedisUrl(): string {
  const url = process.env[REDIS_URL_ENV];
  if (url === undefined || url.length === 0) {
    throw new Error(`Missing or empty environment variable ${REDIS_URL_ENV}`);
  }
  return url;
}

/** Returns a process-wide Redis port backed by `ioredis` and `REDIS_URL`. */
export function getRedisPort(): RedisPort {
  if (global.__bathhubRedisPort !== undefined) {
    return global.__bathhubRedisPort;
  }

  const port = createIoredisRedisPort(getRedisUrl());
  if (process.env.NODE_ENV !== "production") {
    global.__bathhubRedisPort = port;
  }
  return port;
}
