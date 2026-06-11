import {
  initialRemoteSyncGateState,
  remoteSyncCompleted,
  remoteSyncRetryDelayMs,
  remoteSyncStarted,
  shouldAllowNewRemoteRequest,
} from "../app/_client/pure/bathroom/BathroomViewportRemoteGate";
import { BathroomRemoteDB } from "../app/_client/ComponentConstants";

describe("BathroomViewportRemoteGate", () => {
  const readRetryMs = BathroomRemoteDB.READ_RETRY_MS;

  test("allows the first remote request when idle", () => {
    const state = initialRemoteSyncGateState();
    expect(shouldAllowNewRemoteRequest(state, 1_000, readRetryMs)).toBe(true);
    expect(remoteSyncRetryDelayMs(state, 1_000, readRetryMs)).toBeNull();
  });

  test("blocks a new remote request while one is in flight", () => {
    const state = remoteSyncStarted(1_000);
    expect(shouldAllowNewRemoteRequest(state, 1_500, readRetryMs)).toBe(false);
    expect(remoteSyncRetryDelayMs(state, 1_500, readRetryMs)).toBe(1_500);
  });

  test("allows a retry after the configured timeout elapses", () => {
    const state = remoteSyncStarted(1_000);
    const retryAt = 1_000 + readRetryMs;

    expect(shouldAllowNewRemoteRequest(state, retryAt, readRetryMs)).toBe(true);
    expect(remoteSyncRetryDelayMs(state, retryAt, readRetryMs)).toBe(0);
  });

  test("resets the gate after remote sync completes", () => {
    const state = remoteSyncCompleted();
    expect(state).toEqual(initialRemoteSyncGateState());
    expect(shouldAllowNewRemoteRequest(state, 9_999, readRetryMs)).toBe(true);
  });
});
