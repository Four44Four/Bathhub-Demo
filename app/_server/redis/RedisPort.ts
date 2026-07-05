/** Abstraction over Redis so the backing client can be swapped without wide refactors. */
export type RedisPort = {
  incrementWithExpiry(key: string, expirySeconds: number): Promise<number>;
  /** Removes a key; used in integration tests to simulate post-expiry window reset. */
  deleteKey?(key: string): Promise<void>;
  disconnect?(): Promise<void>;
};
