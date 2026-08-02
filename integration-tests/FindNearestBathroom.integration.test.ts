import { spawnSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

import {
  createAt as bathroomDbCreate,
  findNearest as bathroomDbFindNearest,
  incrementRatingCount as bathroomDbIncrementRating,
} from "../app/_server/database/bathroom-data-primary/CrudCore";
import { FIND_NEAREST_BATHROOM_ERROR_CONTEXT } from "../app/_server/pure/bathroom-data-primary/FindNearestBathroom";
import { getReadCache } from "../app/_server/redis/ReadCache";
import { disconnectRedisTestGlobals } from "./disconnectRedisTestGlobals";
import { requireLocalRedis } from "./requireLocalRedis";
import {
  requireLocalSupabaseAdminEnv,
  requireLocalSupabaseEnv,
} from "./requireLocalSupabase";

/**
 * Mid-Atlantic coordinates with no locations.json seed rows.
 * Keeping these fixtures away from global cities prevents unrelated local rows
 * (for example NYC at 40.712776, -74.005974) from affecting nearest results.
 *
 * Test rows are inserted via CrudCore (not the rate-limited Crud wrapper) because
 * Jest runs outside a Next.js request scope where headers() is unavailable.
 */
const ISOLATED_OCEAN_ORIGIN = { latitude: -4.5, longitude: -9.5 } as const;
const ISOLATED_OCEAN_NEAR = { latitude: -4.501, longitude: -9.501 } as const;
const ISOLATED_OCEAN_FAR = { latitude: -4.55, longitude: -9.55 } as const;
/** Separate patch so boundary tests do not pick up seeded London or prior rows. */
const ISOLATED_BOUNDARY_ORIGIN = { latitude: -5.2, longitude: -10.1 } as const;

const DEFAULT_FIND_NEAREST_CONSTRAINTS = {
  maxDistanceM: 20_000,
  minRating: 0,
  factorNonVerified: true,
  factorPendingDeletion: true,
} as const;

const createdBathroomIds: number[] = [];

async function createTrackedBathroom(latitude: number, longitude: number) {
  const row = await bathroomDbCreate(latitude, longitude);
  createdBathroomIds.push(row.id);
  return row;
}

function requireLocalPostgresUrl(): string {
  const raw = process.env.SUPABASE_DB_URL;
  if (raw === undefined || raw.length === 0) {
    throw new Error(
      "SUPABASE_DB_URL is required for FindNearestBathroom factor filter tests",
    );
  }

  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)) {
    throw new Error(`SUPABASE_DB_URL must point at local Postgres, got ${raw}`);
  }
  return raw;
}

function runPsql(databaseUrl: string, query: string): void {
  const result = spawnSync(
    "psql",
    [
      databaseUrl,
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
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
}

function setBathroomExistenceValue(id: number, existenceValue: number): void {
  runPsql(
    requireLocalPostgresUrl(),
    `UPDATE bathroom_data_primary SET existence_value = ${existenceValue} WHERE id = ${id};`,
  );
}

function setBathroomDeletionWaitStartedTimestamp(
  id: number,
  timestamp: string | null,
): void {
  const value =
    timestamp === null ? "NULL" : `'${timestamp.replace(/'/g, "''")}'::timestamp`;
  runPsql(
    requireLocalPostgresUrl(),
    `UPDATE bathroom_data_primary SET deletion_wait_started_timestamp = ${value} WHERE id = ${id};`,
  );
}

describe("find nearest bathroom against local Supabase", () => {
  beforeAll(() => {
    requireLocalRedis();
    requireLocalSupabaseEnv();
  });

  afterAll(async () => {
    const readCache = getReadCache();
    await Promise.all(
      createdBathroomIds.map((id) => readCache.removeBathroom(id)),
    );

    if (createdBathroomIds.length > 0) {
      const { url, serviceRoleKey } = requireLocalSupabaseAdminEnv();
      const { error } = await createClient(url, serviceRoleKey)
        .from("bathroom_data_primary")
        .delete()
        .in("id", createdBathroomIds);

      if (error !== null) {
        throw new Error(
          `Failed to clean up FindNearestBathroom test rows: ${error.message}`,
        );
      }
    }

    await disconnectRedisTestGlobals();
  });

  test("returns the closest bathroom within max distance", async () => {
    const origin = ISOLATED_OCEAN_ORIGIN;
    const near = await createTrackedBathroom(
      ISOLATED_OCEAN_NEAR.latitude,
      ISOLATED_OCEAN_NEAR.longitude,
    );
    await createTrackedBathroom(
      ISOLATED_OCEAN_FAR.latitude,
      ISOLATED_OCEAN_FAR.longitude,
    );

    const result = await bathroomDbFindNearest(origin, {
      ...DEFAULT_FIND_NEAREST_CONSTRAINTS,
      maxDistanceM: 20_000,
    });
    expect(result).not.toBeNull();
    expect(result?.id).toBe(near.id);
    expect(result?.latitude).toBeCloseTo(ISOLATED_OCEAN_NEAR.latitude, 3);
    expect(result?.longitude).toBeCloseTo(ISOLATED_OCEAN_NEAR.longitude, 3);
  });

  test("returns null when no bathroom is within max distance", async () => {
    const result = await bathroomDbFindNearest(
      { latitude: -81, longitude: 1 },
      { ...DEFAULT_FIND_NEAREST_CONSTRAINTS, maxDistanceM: 100 },
    );
    expect(result).toBeNull();
  });

  test("respects max distance boundary", async () => {
    const origin = ISOLATED_BOUNDARY_ORIGIN;
    const bathroom = await createTrackedBathroom(
      ISOLATED_BOUNDARY_ORIGIN.latitude + 0.001,
      ISOLATED_BOUNDARY_ORIGIN.longitude + 0.001,
    );

    const within = await bathroomDbFindNearest(origin, {
      ...DEFAULT_FIND_NEAREST_CONSTRAINTS,
      maxDistanceM: 500,
    });
    expect(within?.id).toBe(bathroom.id);

    const outside = await bathroomDbFindNearest(origin, {
      ...DEFAULT_FIND_NEAREST_CONSTRAINTS,
      maxDistanceM: 1,
    });
    expect(outside).toBeNull();
  });

  test("excludes bathrooms below minimum average rating", async () => {
    const origin = { latitude: -4.6, longitude: -9.6 } as const;
    const closeLowRated = await createTrackedBathroom(
      origin.latitude + 0.0001,
      origin.longitude + 0.0001,
    );
    const fartherHighRated = await createTrackedBathroom(
      origin.latitude + 0.002,
      origin.longitude + 0.002,
    );

    await bathroomDbIncrementRating(closeLowRated.id, 1);
    await bathroomDbIncrementRating(fartherHighRated.id, 5);
    await bathroomDbIncrementRating(fartherHighRated.id, 4);

    const closest = await bathroomDbFindNearest(origin, DEFAULT_FIND_NEAREST_CONSTRAINTS);
    expect(closest?.id).toBe(closeLowRated.id);

    const highRatedOnly = await bathroomDbFindNearest(origin, {
      ...DEFAULT_FIND_NEAREST_CONSTRAINTS,
      minRating: 4,
    });
    expect(highRatedOnly?.id).toBe(fartherHighRated.id);

    const tooStrict = await bathroomDbFindNearest(origin, {
      ...DEFAULT_FIND_NEAREST_CONSTRAINTS,
      minRating: 5,
    });
    expect(tooStrict).toBeNull();
  });

  test("excludes non-verified bathrooms when factor non-verified is false", async () => {
    const origin = { latitude: -4.7, longitude: -9.7 } as const;
    const closeUnverified = await createTrackedBathroom(
      origin.latitude + 0.0001,
      origin.longitude + 0.0001,
    );
    const fartherVerified = await createTrackedBathroom(
      origin.latitude + 0.002,
      origin.longitude + 0.002,
    );

    setBathroomExistenceValue(closeUnverified.id, 0);
    setBathroomExistenceValue(fartherVerified.id, 1);

    const includingUnverified = await bathroomDbFindNearest(
      origin,
      DEFAULT_FIND_NEAREST_CONSTRAINTS,
    );
    expect(includingUnverified?.id).toBe(closeUnverified.id);

    const verifiedOnly = await bathroomDbFindNearest(origin, {
      ...DEFAULT_FIND_NEAREST_CONSTRAINTS,
      factorNonVerified: false,
    });
    expect(verifiedOnly?.id).toBe(fartherVerified.id);
  });

  test("excludes pending-deletion bathrooms when factor pending-deletion is false", async () => {
    const origin = { latitude: -4.8, longitude: -9.8 } as const;
    const closePendingDeletion = await createTrackedBathroom(
      origin.latitude + 0.0001,
      origin.longitude + 0.0001,
    );
    const fartherActive = await createTrackedBathroom(
      origin.latitude + 0.002,
      origin.longitude + 0.002,
    );

    setBathroomDeletionWaitStartedTimestamp(
      closePendingDeletion.id,
      "2026-01-01T00:00:00.000Z",
    );

    const includingPendingDeletion = await bathroomDbFindNearest(
      origin,
      DEFAULT_FIND_NEAREST_CONSTRAINTS,
    );
    expect(includingPendingDeletion?.id).toBe(closePendingDeletion.id);

    const activeOnly = await bathroomDbFindNearest(origin, {
      ...DEFAULT_FIND_NEAREST_CONSTRAINTS,
      factorPendingDeletion: false,
    });
    expect(activeOnly?.id).toBe(fartherActive.id);
  });

  describe("error paths", () => {
    test("bathroomDbFindNearest rejects NaN coordinates from RPC validation", async () => {
      await expect(
        bathroomDbFindNearest(
          { latitude: Number.NaN, longitude: 0 },
          { ...DEFAULT_FIND_NEAREST_CONSTRAINTS, maxDistanceM: 1_000 },
        ),
      ).rejects.toThrow(FIND_NEAREST_BATHROOM_ERROR_CONTEXT);
    });

    test("bathroomDbFindNearest rejects negative max distance from RPC validation", async () => {
      await expect(
        bathroomDbFindNearest(ISOLATED_OCEAN_ORIGIN, {
          ...DEFAULT_FIND_NEAREST_CONSTRAINTS,
          maxDistanceM: -1,
        }),
      ).rejects.toThrow(FIND_NEAREST_BATHROOM_ERROR_CONTEXT);
    });

    test("bathroomDbFindNearest rejects invalid min rating from RPC validation", async () => {
      await expect(
        bathroomDbFindNearest(ISOLATED_OCEAN_ORIGIN, {
          ...DEFAULT_FIND_NEAREST_CONSTRAINTS,
          minRating: 6,
        }),
      ).rejects.toThrow(FIND_NEAREST_BATHROOM_ERROR_CONTEXT);
    });
  });
});
