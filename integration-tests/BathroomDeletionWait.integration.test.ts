import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

import {
  createAt as bathroomDbCreate,
  decayAllExistenceValues as bathroomDbDecayAllExistenceValues,
  deleteExpiredPendingDeletionBathroomsFromDatabase as bathroomDbDeleteExpiredPendingDeletionBathrooms,
  incrementExistenceVoteCount as bathroomDbIncrementExistenceVote,
} from "../app/_server/database/bathroom-data-primary/CrudCore";
import {
  BATHROOM_DELETION_TIME_AFTER_DELETION_START_DAYS,
  BATHROOM_EXISTENCE_VALUE_DELETION_START_THRESHOLD,
  DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_CRON_SCHEDULE_UTC,
  DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_RPC_NAME,
} from "../app/_server/pure/bathroom-data-primary/DeleteExpiredPendingDeletionBathrooms";
import {
  BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_FACTOR,
  decayBathroomExistenceValue,
} from "../app/_server/pure/bathroom-data-primary/DecayBathroomExistenceValue";
import { type BathroomDataPrimaryRow } from "../app/_shared/BathroomDataPrimary";
import { disconnectRedisTestGlobals } from "./disconnectRedisTestGlobals";
import { requireLocalRedis } from "./requireLocalRedis";
import {
  requireLocalSupabaseAdminEnv,
  requireLocalSupabaseEnv,
} from "./requireLocalSupabase";

type CronJobRow = {
  jobname: string;
  schedule: string;
  command: string;
};

type DeletionWaitRow = {
  id: number;
  existence_value: number;
  deletion_wait_started_timestamp: string | null;
  version: number;
};

function requireLocalPostgresUrl(): string {
  const raw = process.env.SUPABASE_DB_URL;
  if (raw === undefined || raw.length === 0) {
    throw new Error(
      "SUPABASE_DB_URL is required for deletion wait integration tests",
    );
  }

  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)) {
    throw new Error(`SUPABASE_DB_URL must point at local Postgres, got ${raw}`);
  }
  return raw;
}

function runPsql(databaseUrl: string, query: string): string {
  const result = spawnSync(
    "psql",
    [
      databaseUrl,
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--command",
      query,
    ],
    { encoding: "utf8" },
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

function readDeletionWaitRows(ids: readonly number[]): Record<number, DeletionWaitRow> {
  if (ids.length === 0) {
    return {};
  }

  const databaseUrl = requireLocalPostgresUrl();
  const idList = ids.join(",");
  const raw = runPsql(
    databaseUrl,
    `
      SELECT COALESCE(
        json_object_agg(
          id,
          json_build_object(
            'id', id,
            'existence_value', existence_value,
            'deletion_wait_started_timestamp', deletion_wait_started_timestamp,
            'version', version
          )
        ),
        '{}'::json
      )::text
      FROM bathroom_data_primary
      WHERE id IN (${idList});
    `,
  ).trim();

  const parsed = JSON.parse(raw || "{}") as Record<string, DeletionWaitRow>;
  return Object.fromEntries(
    Object.entries(parsed).map(([id, row]) => [Number(id), row]),
  );
}

function setDeletionWaitStartedTimestamp(
  id: number,
  timestamp: string | null,
): void {
  const databaseUrl = requireLocalPostgresUrl();
  const value =
    timestamp === null ? "NULL" : `'${timestamp.replace(/'/g, "''")}'::timestamp`;
  runPsql(
    databaseUrl,
    `
      UPDATE bathroom_data_primary
      SET deletion_wait_started_timestamp = ${value}
      WHERE id = ${id};
    `,
  );
}

function readDeleteExpiredCronJob(databaseUrl: string): CronJobRow | null {
  const raw = runPsql(
    databaseUrl,
    `
      SELECT json_build_object(
        'jobname', job.jobname,
        'schedule', job.schedule,
        'command', job.command
      )::text
      FROM cron.job AS job
      WHERE job.jobname = 'delete_expired_pending_deletion_bathrooms_daily';
    `,
  ).trim();

  if (raw.length === 0) {
    return null;
  }

  return JSON.parse(raw) as CronJobRow;
}

describe("bathroom deletion wait against local Supabase", () => {
  const createdIds: number[] = [];

  beforeAll(() => {
    requireLocalRedis();
    requireLocalSupabaseEnv();
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      const { url, serviceRoleKey } = requireLocalSupabaseAdminEnv();
      const { error } = await createClient(url, serviceRoleKey)
        .from("bathroom_data_primary")
        .delete()
        .in("id", createdIds);

      if (error !== null) {
        throw new Error(
          `Failed to clean deletion wait fixtures: ${error.message}`,
        );
      }
    }

    await disconnectRedisTestGlobals();
  });

  async function createFixture(
    latitude: number,
    longitude: number,
    existenceVotes: number,
  ): Promise<BathroomDataPrimaryRow> {
    const row = await bathroomDbCreate(latitude, longitude);
    createdIds.push(row.id);

    let current = row;
    const side = existenceVotes >= 0 ? "exists" : "not_exists";
    const voteCount = Math.abs(existenceVotes);
    for (let vote = 0; vote < voteCount; vote += 1) {
      current = await bathroomDbIncrementExistenceVote(current.id, side);
    }

    return current;
  }

  test("vote against at threshold starts deletion wait", async () => {
    const row = await createFixture(-42.1, 175.1, -9);
    expect(row.existence_value).toBe(-9);

    await bathroomDbIncrementExistenceVote(row.id, "not_exists");

    const [updated] = Object.values(readDeletionWaitRows([row.id]));
    expect(updated.existence_value).toBe(
      BATHROOM_EXISTENCE_VALUE_DELETION_START_THRESHOLD,
    );
    expect(updated.deletion_wait_started_timestamp).not.toBeNull();
  });

  test("vote against during deletion wait does nothing", async () => {
    const row = await createFixture(-42.25, 175.25, -10);
    const before = readDeletionWaitRows([row.id])[row.id];
    expect(before.deletion_wait_started_timestamp).not.toBeNull();

    await bathroomDbIncrementExistenceVote(row.id, "not_exists");

    const after = readDeletionWaitRows([row.id])[row.id];
    expect(after.existence_value).toBe(before.existence_value);
    expect(after.deletion_wait_started_timestamp).toBe(
      before.deletion_wait_started_timestamp,
    );
    expect(after.version).toBe(before.version);
  });

  test("vote for clears deletion wait", async () => {
    const row = await createFixture(-42.2, 175.2, -10);
    const pending = readDeletionWaitRows([row.id])[row.id];
    expect(pending.deletion_wait_started_timestamp).not.toBeNull();

    await bathroomDbIncrementExistenceVote(row.id, "exists");

    const [updated] = Object.values(readDeletionWaitRows([row.id]));
    expect(updated.existence_value).toBe(-9);
    expect(updated.deletion_wait_started_timestamp).toBeNull();
  });

  test("decay skips bathrooms pending deletion", async () => {
    const active = await createFixture(-42.3, 175.3, 5);
    const pending = await createFixture(-42.4, 175.4, -10);

    const before = readDeletionWaitRows([active.id, pending.id]);
    expect(before[active.id].existence_value).toBe(5);
    expect(before[pending.id].existence_value).toBe(-10);
    expect(before[pending.id].deletion_wait_started_timestamp).not.toBeNull();

    const updatedCount = await bathroomDbDecayAllExistenceValues();
    expect(updatedCount).toBeGreaterThanOrEqual(1);

    const after = readDeletionWaitRows([active.id, pending.id]);
    expect(after[active.id].existence_value).toBeCloseTo(
      decayBathroomExistenceValue(before[active.id].existence_value),
      5,
    );
    expect(after[pending.id].existence_value).toBe(-10);
    expect(after[pending.id].deletion_wait_started_timestamp).not.toBeNull();
  });

  test("delete expired RPC removes bathrooms past the deletion wait period", async () => {
    const expired = await createFixture(-42.5, 175.5, -10);
    const stillPending = await createFixture(-42.6, 175.6, -10);

    const expiredStartedAt = new Date(
      Date.now() - (BATHROOM_DELETION_TIME_AFTER_DELETION_START_DAYS + 1) * 86_400_000,
    ).toISOString();
    const recentStartedAt = new Date(Date.now() - 86_400_000).toISOString();

    setDeletionWaitStartedTimestamp(expired.id, expiredStartedAt);
    setDeletionWaitStartedTimestamp(stillPending.id, recentStartedAt);

    const deletedCount =
      await bathroomDbDeleteExpiredPendingDeletionBathrooms();
    expect(deletedCount).toBeGreaterThanOrEqual(1);

    const remaining = readDeletionWaitRows([expired.id, stillPending.id]);
    expect(remaining[expired.id]).toBeUndefined();
    expect(remaining[stillPending.id].deletion_wait_started_timestamp).not.toBeNull();

    createdIds.splice(createdIds.indexOf(expired.id), 1);
  });

  test("pg_cron schedules the daily delete-expired task at 00:00 UTC", () => {
    const databaseUrl = requireLocalPostgresUrl();
    const cronJob = readDeleteExpiredCronJob(databaseUrl);

    expect(cronJob).toEqual({
      jobname: "delete_expired_pending_deletion_bathrooms_daily",
      schedule: DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_CRON_SCHEDULE_UTC,
      command: `SELECT public.${DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_RPC_NAME}();`,
    });
  });

  test("decay factor constant matches the database multiplier", () => {
    expect(BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_FACTOR).toBe(0.995);
    expect(BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_FACTOR).toBe(1 - 0.005);
  });

  test("deployed SQL literals match exported deletion-wait constants", () => {
    const databaseUrl = requireLocalPostgresUrl();
    const voteDefinition = runPsql(
      databaseUrl,
      `
        SELECT pg_get_functiondef(procedure.oid)
        FROM pg_proc AS procedure
        JOIN pg_namespace AS namespace
          ON namespace.oid = procedure.pronamespace
        WHERE namespace.nspname = 'public'
          AND procedure.proname = 'increment_bathroom_data_primary_existence_vote_count';
      `,
    );
    const deleteDefinition = runPsql(
      databaseUrl,
      `
        SELECT pg_get_functiondef(procedure.oid)
        FROM pg_proc AS procedure
        JOIN pg_namespace AS namespace
          ON namespace.oid = procedure.pronamespace
        WHERE namespace.nspname = 'public'
          AND procedure.proname = '${DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_RPC_NAME}';
      `,
    );

    expect(voteDefinition).toContain(
      BATHROOM_EXISTENCE_VALUE_DELETION_START_THRESHOLD.toFixed(1),
    );
    expect(voteDefinition).toContain(
      "AND b.deletion_wait_started_timestamp IS NOT NULL THEN",
    );
    expect(deleteDefinition).toContain(
      `INTERVAL '${BATHROOM_DELETION_TIME_AFTER_DELETION_START_DAYS} days'`,
    );
  });
});
