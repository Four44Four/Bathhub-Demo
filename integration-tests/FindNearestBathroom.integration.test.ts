import { createClient } from "@supabase/supabase-js";

import {
  createAt as bathroomDbCreate,
  findNearest as bathroomDbFindNearest,
  incrementRatingCount as bathroomDbIncrementRating,
} from "../app/_server/database/bathroom-data-primary/CrudCore";
import { FIND_NEAREST_BATHROOM_ERROR_CONTEXT } from "../app/_server/pure/bathroom-data-primary/FindNearestBathroom";
import { disconnectRedisTestGlobals } from "./disconnectRedisTestGlobals";
import { requireLocalSupabaseEnv } from "./requireLocalSupabase";

/**
 * Mid-Atlantic coordinates with no locations.json seed rows.
 * Crud.integration.test.ts runs first and seeds global cities (including NYC
 * at 40.712776, -74.005974), so NYC-adjacent origins would pick the seed.
 *
 * Test rows are inserted via CrudCore (not the rate-limited Crud wrapper) because
 * Jest runs outside a Next.js request scope where headers() is unavailable.
 */
const ISOLATED_OCEAN_ORIGIN = { latitude: -4.5, longitude: -9.5 } as const;
const ISOLATED_OCEAN_NEAR = { latitude: -4.501, longitude: -9.501 } as const;
const ISOLATED_OCEAN_FAR = { latitude: -4.55, longitude: -9.55 } as const;
/** Separate patch so boundary tests do not pick up seeded London or prior rows. */
const ISOLATED_BOUNDARY_ORIGIN = { latitude: -5.2, longitude: -10.1 } as const;

const createdBathroomIds: number[] = [];

async function createTrackedBathroom(latitude: number, longitude: number) {
  const row = await bathroomDbCreate(latitude, longitude);
  createdBathroomIds.push(row.id);
  return row;
}

describe("find nearest bathroom against local Supabase", () => {
  beforeAll(() => {
    requireLocalSupabaseEnv();
  });

  afterAll(async () => {
    if (createdBathroomIds.length > 0) {
      const { url, key } = requireLocalSupabaseEnv();
      const { error } = await createClient(url, key)
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
      maxDistanceM: 20_000,
      minRating: 0,
    });
    expect(result).not.toBeNull();
    expect(result?.id).toBe(near.id);
    expect(result?.latitude).toBeCloseTo(ISOLATED_OCEAN_NEAR.latitude, 3);
    expect(result?.longitude).toBeCloseTo(ISOLATED_OCEAN_NEAR.longitude, 3);
  });

  test("returns null when no bathroom is within max distance", async () => {
    const result = await bathroomDbFindNearest(
      { latitude: -81, longitude: 1 },
      { maxDistanceM: 100, minRating: 0 },
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
      maxDistanceM: 500,
      minRating: 0,
    });
    expect(within?.id).toBe(bathroom.id);

    const outside = await bathroomDbFindNearest(origin, {
      maxDistanceM: 1,
      minRating: 0,
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
    await bathroomDbIncrementRating(fartherHighRated.id, 5);

    const closest = await bathroomDbFindNearest(origin, {
      maxDistanceM: 20_000,
      minRating: 0,
    });
    expect(closest?.id).toBe(closeLowRated.id);

    const highRatedOnly = await bathroomDbFindNearest(origin, {
      maxDistanceM: 20_000,
      minRating: 4,
    });
    expect(highRatedOnly?.id).toBe(fartherHighRated.id);

    const tooStrict = await bathroomDbFindNearest(origin, {
      maxDistanceM: 20_000,
      minRating: 5,
    });
    expect(tooStrict).toBeNull();
  });

  describe("error paths", () => {
    test("bathroomDbFindNearest rejects NaN coordinates from RPC validation", async () => {
      await expect(
        bathroomDbFindNearest(
          { latitude: Number.NaN, longitude: 0 },
          { maxDistanceM: 1_000, minRating: 0 },
        ),
      ).rejects.toThrow(FIND_NEAREST_BATHROOM_ERROR_CONTEXT);
    });

    test("bathroomDbFindNearest rejects negative max distance from RPC validation", async () => {
      await expect(
        bathroomDbFindNearest(ISOLATED_OCEAN_ORIGIN, {
          maxDistanceM: -1,
          minRating: 0,
        }),
      ).rejects.toThrow(FIND_NEAREST_BATHROOM_ERROR_CONTEXT);
    });

    test("bathroomDbFindNearest rejects invalid min rating from RPC validation", async () => {
      await expect(
        bathroomDbFindNearest(ISOLATED_OCEAN_ORIGIN, {
          maxDistanceM: 1_000,
          minRating: 6,
        }),
      ).rejects.toThrow(FIND_NEAREST_BATHROOM_ERROR_CONTEXT);
    });
  });
});
