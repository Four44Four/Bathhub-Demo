const TRANSACTION_BOUNDARY = /^\s*(BEGIN|COMMIT|ROLLBACK)\s*;?\s*$/i;

/** Strips literal transaction boundaries from migration script arrays. */
export function stripUserSettingsMigrationTransactionBoundaries(
  scripts: readonly string[],
): string[] {
  return scripts.filter((sql) => !TRANSACTION_BOUNDARY.test(sql.trim()));
}

/**
 * Runs migration SQL inside a single SQLite transaction.
 * Legacy BEGIN/COMMIT entries in `scripts` are ignored so callers cannot leave
 * transactions open across separate exec calls.
 */
export function execUserSettingsMigrationScripts(
  exec: (sql: string) => void,
  scripts: readonly string[],
): void {
  const statements = stripUserSettingsMigrationTransactionBoundaries(scripts);
  exec("BEGIN");
  try {
    for (const sql of statements) {
      exec(sql);
    }
    exec("COMMIT");
  } catch (error) {
    try {
      exec("ROLLBACK");
    } catch {
      // Best-effort rollback when the migration transaction is still open.
    }
    throw error;
  }
}
