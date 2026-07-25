import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const WORKSPACE_ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(WORKSPACE_ROOT, "supabase", "migrations");
const IDEMPOTENT_MIGRATION_START = "20260706000000";
// These migrations still reference verify_status / vote-count columns which later
// migrations remove. Rerunning them after the existence_value migration would regress RPCs.
const NON_RERUNNABLE_MIGRATION_FILENAMES = new Set([
  "20260706000000_bathroom_data_primary_h3_cell_rpc.sql",
  "20260714000000_bathroom_data_primary_read_by_id_rpc.sql",
  "20260715000000_bathroom_data_primary_increment_rating_rpc.sql",
  "20260717000000_bathroom_data_primary_existence_votes.sql",
  "20260718000000_bathroom_data_primary_increment_existence_vote_rpc.sql",
]);
const EXPECTED_LATEST_SCHEMA_VERSION = 22;
const EXPECTED_RATING_COLUMNS = 5;
const EXPECTED_RPC_COUNT = 10;

type ServerSchemaState = {
  schemaVersionRows: number;
  schemaVersion: number;
  ratingColumnCount: number;
  existenceVoteColumnCount: number;
  deletionWaitColumnCount: number;
  verifyStatusColumnCount: number;
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
        filename.localeCompare(`${IDEMPOTENT_MIGRATION_START}_`) >= 0 &&
        !NON_RERUNNABLE_MIGRATION_FILENAMES.has(filename),
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
      'existenceVoteColumnCount',
        (
          SELECT COUNT(*)
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'bathroom_data_primary'
            AND column_name = 'existence_value'
        ),
      'deletionWaitColumnCount',
        (
          SELECT COUNT(*)
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'bathroom_data_primary'
            AND column_name = 'deletion_wait_started_timestamp'
        ),
      'verifyStatusColumnCount',
        (
          SELECT COUNT(*)
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'bathroom_data_primary'
            AND column_name = 'verify_status'
        ),
      'rpcCount',
        (
          SELECT COUNT(*)
          FROM pg_proc AS procedure
          JOIN pg_namespace AS namespace
            ON namespace.oid = procedure.pronamespace
          WHERE namespace.nspname = 'public'
            AND procedure.proname IN (
              'create_bathroom_data_primary_at',
              'get_bathroom_data_primary_in_bbox',
              'get_bathroom_data_primary_in_h3_cell_polygons',
              'sync_bathroom_data_primary_in_bbox',
              'get_nearest_bathroom_data_primary',
              'get_bathroom_data_primary_by_id',
              'increment_bathroom_data_primary_rating_count',
              'increment_bathroom_data_primary_existence_vote_count',
              'decay_bathroom_data_primary_existence_value',
              'delete_expired_pending_deletion_bathrooms'
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
  test("idempotent server migrations preserve latest schema state when rerun", () => {
    const databaseUrl = requireLocalPostgresUrl();
    const migrationPaths = listRerunnableMigrationPaths();
    expect(migrationPaths.map((migrationPath) => path.basename(migrationPath))).toEqual([
      "20260707000000_server_db_schema_version.sql",
      "20260713000000_bathroom_data_primary_rating_counts.sql",
      "20260716000000_bathroom_nearest_rpc_min_rating.sql",
      "20260725000000_bathroom_data_primary_existence_value.sql",
      "20260726000000_bathroom_data_primary_existence_value_decay.sql",
      "20260726500000_bathroom_data_primary_deletion_wait_started_timestamp.sql",
      "20260727000000_bathroom_data_primary_deletion_wait.sql",
      "20260728000000_bathroom_data_primary_pending_deletion_reading.sql",
      "20260729000000_bathroom_data_primary_read_rpcs_deletion_wait.sql",
      "20260730000000_bathroom_data_primary_vote_against_deletion_wait_noop.sql",
    ]);

    const before = readServerSchemaState(databaseUrl);
    expect(before).toEqual({
      schemaVersionRows: 1,
      schemaVersion: EXPECTED_LATEST_SCHEMA_VERSION,
      ratingColumnCount: EXPECTED_RATING_COLUMNS,
      existenceVoteColumnCount: 1,
      deletionWaitColumnCount: 1,
      verifyStatusColumnCount: 0,
      rpcCount: EXPECTED_RPC_COUNT,
    });

    rerunMigrations(databaseUrl, migrationPaths);
    rerunMigrations(databaseUrl, migrationPaths);

    expect(readServerSchemaState(databaseUrl)).toEqual(before);
  });

  test("read and create RPCs expose deletion_wait_started_timestamp", () => {
    const databaseUrl = requireLocalPostgresUrl();
    const tableReturningRpcs = [
      "create_bathroom_data_primary_at",
      "get_bathroom_data_primary_in_bbox",
      "get_bathroom_data_primary_in_h3_cell_polygons",
      "get_bathroom_data_primary_by_id",
    ] as const;

    const resultSignaturesRaw = runPsql(databaseUrl, [
      "--tuples-only",
      "--no-align",
      "--command",
      `
        SELECT COALESCE(
          json_object_agg(proname, pg_get_function_result(procedure.oid)),
          '{}'::json
        )::text
        FROM pg_proc AS procedure
        JOIN pg_namespace AS namespace
          ON namespace.oid = procedure.pronamespace
        WHERE namespace.nspname = 'public'
          AND procedure.proname IN (
            ${tableReturningRpcs.map((name) => `'${name}'`).join(", ")}
          );
      `,
    ]).trim();
    const resultSignatures = JSON.parse(resultSignaturesRaw) as Record<
      string,
      string
    >;

    expect(Object.keys(resultSignatures).sort()).toEqual([...tableReturningRpcs].sort());
    for (const resultSignature of Object.values(resultSignatures)) {
      expect(resultSignature).toContain("deletion_wait_started_timestamp");
    }

    const syncDefinition = runPsql(databaseUrl, [
      "--tuples-only",
      "--no-align",
      "--command",
      `
        SELECT pg_get_functiondef(procedure.oid)
        FROM pg_proc AS procedure
        JOIN pg_namespace AS namespace
          ON namespace.oid = procedure.pronamespace
        WHERE namespace.nspname = 'public'
          AND procedure.proname = 'sync_bathroom_data_primary_in_bbox';
      `,
    ]);
    expect(syncDefinition).toContain("deletion_wait_started_timestamp");
  });
});
