/** Abstraction over Redis so the backing client can be swapped without wide refactors. */
export type RedisPort = {
  incrementWithExpiry(key: string, expirySeconds: number): Promise<number>;
  getString(key: string): Promise<string | null>;
  setStringWithExpiry(
    key: string,
    value: string,
    expirySeconds: number,
  ): Promise<void>;
  deleteKey(key: string): Promise<void>;
  disconnect?(): Promise<void>;
};
