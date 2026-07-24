import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const WORKSPACE_ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(WORKSPACE_ROOT, "supabase", "migrations");
const IDEMPOTENT_MIGRATION_START = "20260706000000";
const EXPECTED_LATEST_SCHEMA_VERSION = 13;
const EXPECTED_RATING_COLUMNS = 5;
const EXPECTED_RPC_COUNT = 3;

type ServerSchemaState = {
  schemaVersionRows: number;
  schemaVersion: number;
  ratingColumnCount: number;
  rpcCount: number;
};

function requireLocalPostgresUrl(): string {
  const raw = process.env.SUPABASE_DB_URL;
  if (raw === undefined || raw.length === 0) {
    throw new Error("SUPABASE_DB_URL is required for server migration tests");
  }

  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)) {
    throw new Error(`SUPABASE_DB_URL must point at local Postgres, got ${raw}`);
  }
  return raw;
}

function listRerunnableMigrationPaths(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter(
      (filename) =>
        filename.endsWith(".sql") &&
        filename.localeCompare(`${IDEMPOTENT_MIGRATION_START}_`) >= 0,
    )
    .sort()
    .map((filename) => path.join(MIGRATIONS_DIR, filename));
}

function runPsql(
  databaseUrl: string,
  args: readonly string[],
): string {
  const result = spawnSync(
    "psql",
    [databaseUrl, "--no-psqlrc", "--set=ON_ERROR_STOP=1", ...args],
    {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
    },
  );

  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `psql exited with status ${result.status}: ${result.stderr.trim()}`,
    );
  }
  return result.stdout;
}

function readServerSchemaState(databaseUrl: string): ServerSchemaState {
  const query = `
    SELECT json_build_object(
      'schemaVersionRows',
        (SELECT COUNT(*) FROM public.server_db_schema_version),
      'schemaVersion',
        (SELECT MAX(version) FROM public.server_db_schema_version),
      'ratingColumnCount',
        (
          SELECT COUNT(*)
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'bathroom_data_primary'
            AND column_name LIKE 'rating_%_count'
        ),
      'rpcCount',
        (
          SELECT COUNT(*)
          FROM pg_proc AS procedure
          JOIN pg_namespace AS namespace
            ON namespace.oid = procedure.pronamespace
          WHERE namespace.nspname = 'public'
            AND procedure.proname IN (
              'get_bathroom_data_primary_in_h3_cell_polygons',
              'get_bathroom_data_primary_by_id',
              'increment_bathroom_data_primary_rating_count'
            )
        )
    )::text;
  `;
  const raw = runPsql(databaseUrl, [
    "--tuples-only",
    "--no-align",
    "--command",
    query,
  ]).trim();
  return JSON.parse(raw) as ServerSchemaState;
}

function rerunMigrations(
  databaseUrl: string,
  migrationPaths: readonly string[],
): void {
  for (const migrationPath of migrationPaths) {
    runPsql(databaseUrl, ["--file", migrationPath]);
  }
}

describe("server PostgreSQL migration reruns", () => {
  test("migrations from 20260706000000 are repeatable and preserve latest schema state", () => {
    const databaseUrl = requireLocalPostgresUrl();
    const migrationPaths = listRerunnableMigrationPaths();
    expect(migrationPaths.map((migrationPath) => path.basename(migrationPath))).toEqual([
      "20260706000000_bathroom_data_primary_h3_cell_rpc.sql",
      "20260707000000_server_db_schema_version.sql",
      "20260713000000_bathroom_data_primary_rating_counts.sql",
      "20260714000000_bathroom_data_primary_read_by_id_rpc.sql",
      "20260715000000_bathroom_data_primary_increment_rating_rpc.sql",
      "20260716000000_bathroom_nearest_rpc_min_rating.sql",
    ]);

    const before = readServerSchemaState(databaseUrl);
    expect(before).toEqual({
      schemaVersionRows: 1,
      schemaVersion: EXPECTED_LATEST_SCHEMA_VERSION,
      ratingColumnCount: EXPECTED_RATING_COLUMNS,
      rpcCount: EXPECTED_RPC_COUNT,
    });

    rerunMigrations(databaseUrl, migrationPaths);
    rerunMigrations(databaseUrl, migrationPaths);

    expect(readServerSchemaState(databaseUrl)).toEqual(before);
  });
});
