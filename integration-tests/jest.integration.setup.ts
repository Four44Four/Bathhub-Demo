import { disconnectRedisTestGlobals } from "./disconnectRedisTestGlobals";

/**
 * Integration suites that touch serverside read cache leave a global Redis client
 * open. Without disconnecting, Jest hangs after the suite (e.g. before GlobeViewport).
 */
afterAll(async () => {
  const testPath = expect.getState().testPath ?? "";
  if (!/integration-tests[/\\]/.test(testPath)) {
    return;
  }

  await disconnectRedisTestGlobals();
});
