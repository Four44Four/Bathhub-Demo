/** Closes process-wide Redis/read-cache singletons opened during integration tests. */
export async function disconnectRedisTestGlobals(): Promise<void> {
  await global.__bathhubRedisPort?.disconnect?.();
  global.__bathhubRedisPort = undefined;
  global.__bathhubReadCachePort = undefined;
}
