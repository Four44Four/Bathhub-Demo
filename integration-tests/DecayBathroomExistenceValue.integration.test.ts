import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

import {
  createAt as bathroomDbCreate,
  decayAllExistenceValues as bathroomDbDecayAllExistenceValues,
  incrementExistenceVoteCount as bathroomDbIncrementExistenceVote,
} from "../app/_server/database/bathroom-data-primary/CrudCore";
import {
  BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_FACTOR,
  BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_CRON_SCHEDULE_UTC,
  DECAY_BATHROOM_EXISTENCE_VALUE_RPC_NAME,
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

function requireLocalPostgresUrl(): string {
  const raw = process.env.SUPABASE_DB_URL;
  if (raw === undefined || raw.length === 0) {
    throw new Error("SUPABASE_DB_URL is required for decay integration tests");
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

function readAllExistenceValuesFromDatabase(): Record<number, number> {
  const databaseUrl = requireLocalPostgresUrl();
  const raw = runPsql(
    databaseUrl,
    `
      SELECT COALESCE(json_object_agg(id, existence_value), '{}'::json)::text
      FROM bathroom_data_primary;
    `,
  ).trim();

  const parsed = JSON.parse(raw || "{}") as Record<string, number>;
  return Object.fromEntries(
    Object.entries(parsed).map(([id, value]) => [Number(id), value]),
  );
}

function isPgCronExtensionInstalled(databaseUrl: string): boolean {
  const raw = runPsql(
    databaseUrl,
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'pg_cron'
      );
    `,
  ).trim();

  return raw === "t";
}

function readDecayCronJob(databaseUrl: string): CronJobRow | null {
  const raw = runPsql(
    databaseUrl,
    `
      SELECT json_build_object(
        'jobname', job.jobname,
        'schedule', job.schedule,
        'command', job.command
      )::text
      FROM cron.job AS job
      WHERE job.jobname = 'decay_bathroom_existence_value_daily';
    `,
  ).trim();

  if (raw.length === 0) {
    return null;
  }

  return JSON.parse(raw) as CronJobRow;
}

describe("bathroom existence value daily decay against local Supabase", () => {
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
        throw new Error(`Failed to clean decay fixtures: ${error.message}`);
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

  test("decay RPC multiplies active bathroom existence_value by 0.995", async () => {
    const positive = await createFixture(-41.1, 174.2, 100);
    const zero = await createFixture(-41.2, 174.3, 0);
    const pendingDeletion = await createFixture(-41.3, 174.4, -10);

    const existenceValuesBefore = readAllExistenceValuesFromDatabase();
    const bathroomIds = Object.keys(existenceValuesBefore).map(Number);

    expect(bathroomIds.length).toBeGreaterThanOrEqual(3);
    expect(existenceValuesBefore[positive.id]).toBe(100);
    expect(existenceValuesBefore[zero.id]).toBe(0);
    expect(existenceValuesBefore[pendingDeletion.id]).toBe(-10);

    const updatedCount = await bathroomDbDecayAllExistenceValues();

    expect(updatedCount).toBeGreaterThanOrEqual(2);

    const existenceValuesAfter = readAllExistenceValuesFromDatabase();
    expect(Object.keys(existenceValuesAfter).length).toBe(bathroomIds.length);

    for (const id of bathroomIds) {
      if (id === pendingDeletion.id) {
        expect(existenceValuesAfter[id]).toBe(-10);
        continue;
      }

      expect(existenceValuesAfter[id]).toBeCloseTo(
        decayBathroomExistenceValue(existenceValuesBefore[id]),
        5,
      );
    }
  });

  test("pg_cron extension is installed and schedules the daily decay task at 00:00 UTC", () => {
    const databaseUrl = requireLocalPostgresUrl();

    expect(isPgCronExtensionInstalled(databaseUrl)).toBe(true);

    const cronJob = readDecayCronJob(databaseUrl);
    expect(cronJob).toEqual({
      jobname: "decay_bathroom_existence_value_daily",
      schedule: BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_CRON_SCHEDULE_UTC,
      command: `SELECT public.${DECAY_BATHROOM_EXISTENCE_VALUE_RPC_NAME}();`,
    });
  });

  test("decay factor constant matches the database multiplier", () => {
    expect(BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_FACTOR).toBe(0.995);
    expect(BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_FACTOR).toBe(1 - 0.005);
  });
});
