import { createClient } from "@supabase/supabase-js";

import { findNearestBathroom } from "../app/_server/FindNearestBathroom";
import {
  bathroomDbCreate,
  bathroomDbFindNearest,
} from "../app/_server/database/bathroom-data-primary/Crud";
import { FIND_NEAREST_BATHROOM_ERROR_CONTEXT } from "../app/_server/pure/bathroom-data-primary/FindNearestBathroom";
import { requireLocalSupabaseEnv } from "./requireLocalSupabase";

/**
 * Mid-Atlantic coordinates with no locations.json seed rows.
 * Crud.integration.test.ts runs first and seeds global cities (including NYC
 * at 40.712776, -74.005974), so NYC-adjacent origins would pick the seed.
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
    if (createdBathroomIds.length === 0) return;

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

    const result = await bathroomDbFindNearest(origin, { maxDistanceM: 20_000 });
    expect(result).not.toBeNull();
    expect(result?.id).toBe(near.id);
    expect(result?.latitude).toBeCloseTo(ISOLATED_OCEAN_NEAR.latitude, 3);
    expect(result?.longitude).toBeCloseTo(ISOLATED_OCEAN_NEAR.longitude, 3);
  });

  test("returns null when no bathroom is within max distance", async () => {
    const result = await bathroomDbFindNearest(
      { latitude: -81, longitude: 1 },
      { maxDistanceM: 100 },
    );
    expect(result).toBeNull();
  });

  test("respects max distance boundary", async () => {
    const origin = ISOLATED_BOUNDARY_ORIGIN;
    const bathroom = await createTrackedBathroom(
      ISOLATED_BOUNDARY_ORIGIN.latitude + 0.001,
      ISOLATED_BOUNDARY_ORIGIN.longitude + 0.001,
    );

    const within = await bathroomDbFindNearest(origin, { maxDistanceM: 500 });
    expect(within?.id).toBe(bathroom.id);

    const outside = await bathroomDbFindNearest(origin, { maxDistanceM: 1 });
    expect(outside).toBeNull();
  });

  test("findNearestBathroom action passes lat/long through and wraps success", async () => {
    const result = await findNearestBathroom(ISOLATED_OCEAN_ORIGIN, {
      maxDistanceM: 20_000,
    });

    expect(result.errorMsg).toBeUndefined();
    expect(result.val).not.toBeNull();
    expect(result.val?.latitude).toBeCloseTo(ISOLATED_OCEAN_NEAR.latitude, 3);
    expect(result.val?.longitude).toBeCloseTo(ISOLATED_OCEAN_NEAR.longitude, 3);
  });

  test("findNearestBathroom action returns null without errorMsg when none found", async () => {
    const result = await findNearestBathroom(
      { latitude: -81, longitude: 1 },
      { maxDistanceM: 100 },
    );

    expect(result).toEqual({ val: null });
    expect(result.errorMsg).toBeUndefined();
  });

  describe("error paths", () => {
    test("bathroomDbFindNearest rejects NaN coordinates from RPC validation", async () => {
      await expect(
        bathroomDbFindNearest(
          { latitude: Number.NaN, longitude: 0 },
          { maxDistanceM: 1_000 },
        ),
      ).rejects.toThrow(FIND_NEAREST_BATHROOM_ERROR_CONTEXT);
    });

    test("bathroomDbFindNearest rejects negative max distance from RPC validation", async () => {
      await expect(
        bathroomDbFindNearest(ISOLATED_OCEAN_ORIGIN, { maxDistanceM: -1 }),
      ).rejects.toThrow(FIND_NEAREST_BATHROOM_ERROR_CONTEXT);
    });

    test("findNearestBathroom action propagates RPC validation error as errorMsg", async () => {
      const result = await findNearestBathroom(
        { latitude: Number.NaN, longitude: 0 },
        { maxDistanceM: 1_000 },
      );

      expect(result.val).toBeNull();
      expect(result.errorMsg).toContain(FIND_NEAREST_BATHROOM_ERROR_CONTEXT);
      expect(result.errorMsg).toContain("invalid nearest-bathroom");
    });
  });
});
