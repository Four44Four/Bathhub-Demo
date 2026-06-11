const SQLITE_MAGIC = "SQLite format 3\u0000";

/** True when `bytes` begin with the standard SQLite database file header. */
export function isSqliteDatabaseBytes(bytes: Uint8Array): boolean {
  if (bytes.byteLength < SQLITE_MAGIC.length) return false;
  for (let i = 0; i < SQLITE_MAGIC.length; i += 1) {
    if (bytes[i] !== SQLITE_MAGIC.charCodeAt(i)) return false;
  }
  return true;
}
