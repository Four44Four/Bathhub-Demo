export type RemoteSyncGateState = {
  remoteInFlight: boolean;
  remoteStartedAtMs: number | null;
};

export function initialRemoteSyncGateState(): RemoteSyncGateState {
  return { remoteInFlight: false, remoteStartedAtMs: null };
}

/** Whether a new remote sync request may start (idle or retry timeout elapsed). */
export function shouldAllowNewRemoteRequest(
  state: RemoteSyncGateState,
  nowMs: number,
  readRetryMs: number,
): boolean {
  if (!state.remoteInFlight) {
    return true;
  }
  if (state.remoteStartedAtMs === null) {
    return false;
  }
  return nowMs - state.remoteStartedAtMs >= readRetryMs;
}

export function remoteSyncStarted(nowMs: number): RemoteSyncGateState {
  return { remoteInFlight: true, remoteStartedAtMs: nowMs };
}

export function remoteSyncCompleted(): RemoteSyncGateState {
  return initialRemoteSyncGateState();
}

/**
 * Milliseconds until a blocked remote request may be retried.
 * Returns 0 when a retry is allowed now, or null when not waiting on an in-flight remote.
 */
export function remoteSyncRetryDelayMs(
  state: RemoteSyncGateState,
  nowMs: number,
  readRetryMs: number,
): number | null {
  if (!state.remoteInFlight || state.remoteStartedAtMs === null) {
    return null;
  }
  const elapsed = nowMs - state.remoteStartedAtMs;
  if (elapsed >= readRetryMs) {
    return 0;
  }
  return readRetryMs - elapsed;
}
