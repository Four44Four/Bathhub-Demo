import "server-only";

import { getRedisUrl } from "../EnvironmentVariables";
import { createIoredisRedisPort } from "./IoredisRedisPort";
import { type RedisPort } from "./RedisPort";

declare global {
  var __bathhubRedisPort: RedisPort | undefined;
}

/** Returns a process-wide Redis port backed by `ioredis` and {@link getRedisUrl}. */
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
