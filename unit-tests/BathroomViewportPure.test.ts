import {
  applyDeletesToRenderedBathrooms,
  applyUpsertsToRenderedBathrooms,
  applyViewportUpsertPreservingLoadedFromCache,
  mergeLocalCacheEntriesIntoRendered,
  replaceRenderedBathrooms,
} from "../app/_client/pure/bathroom/RenderedBathrooms";
import {
  isCameraCloseEnoughForBathroomQuery,
  isGlobeViewportCameraSampleReady,
} from "../app/_client/pure/bathroom/BathroomViewportQuery";
import {
  type BathroomViewportEntry,
  deriveVerifyStatusFromBathroomFields,
  deriveVerifyStatusFromExistenceValue,
} from "../app/_shared/BathroomDataPrimary";

function viewportEntry(
  overrides: Partial<BathroomViewportEntry> & Pick<BathroomViewportEntry, "id">,
): BathroomViewportEntry {
  const existence_value = overrides.existence_value ?? 0;
  const deletion_wait_started_timestamp =
    overrides.deletion_wait_started_timestamp ?? null;
  return {
    latitude: 0,
    longitude: 0,
    version: 0,
    existence_value,
    deletion_wait_started_timestamp,
    verify_status: deriveVerifyStatusFromBathroomFields(
      existence_value,
      deletion_wait_started_timestamp,
    ),
    ...overrides,
  };
}

describe("Bathroom viewport pure helpers", () => {
  test("isGlobeViewportCameraSampleReady rejects the pre-sample sentinel", () => {
    expect(isGlobeViewportCameraSampleReady(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isGlobeViewportCameraSampleReady(1_500)).toBe(true);
  });

  test("isCameraCloseEnoughForBathroomQuery respects max height", () => {
    expect(isCameraCloseEnoughForBathroomQuery(2_000, 3_000)).toBe(true);
    expect(isCameraCloseEnoughForBathroomQuery(4_000, 3_000)).toBe(false);
    expect(
      isCameraCloseEnoughForBathroomQuery(Number.POSITIVE_INFINITY, 3_000),
    ).toBe(false);
  });

  test("rendered bathroom map upserts and deletes by id", () => {
    const initial = replaceRenderedBathrooms([
      viewportEntry({
        id: 1,
        latitude: 1,
        longitude: 2,
        version: 0,
      }),
    ]);

    expect(initial.get(1)?.loadedFromCache).toBe(true);

    const withUpsert = applyUpsertsToRenderedBathrooms(
      initial,
      [
        viewportEntry({
          id: 2,
          latitude: 3,
          longitude: 4,
          existence_value: 2,
          version: 1,
        }),
      ],
      new Set(),
    );
    const afterDelete = applyDeletesToRenderedBathrooms(withUpsert, [1]);

    expect(Array.from(afterDelete.keys())).toEqual([2]);
    expect(withUpsert.get(2)?.loadedFromCache).toBe(false);
    expect(withUpsert.get(1)?.loadedFromCache).toBe(true);
  });

  test("remote upsert marks stale cache rows as loadedFromCache", () => {
    const initial = replaceRenderedBathrooms([
      viewportEntry({
        id: 1,
        latitude: 1,
        longitude: 2,
        version: 0,
      }),
    ]);

    const withStaleUpsert = applyUpsertsToRenderedBathrooms(
      initial,
      [
        viewportEntry({
          id: 1,
          latitude: 1,
          longitude: 2,
          existence_value: 2,
          version: 2,
        }),
      ],
      new Set([1]),
    );

    expect(withStaleUpsert.get(1)?.loadedFromCache).toBe(true);
    expect(withStaleUpsert.get(1)?.verify_status).toBe("verified");
  });

  test("mergeLocalCacheEntriesIntoRendered preserves remote-fetch debug flags", () => {
    const previous = replaceRenderedBathrooms([
      viewportEntry({
        id: 1,
        latitude: 1,
        longitude: 2,
        existence_value: 2,
        version: 1,
      }),
    ]);
    previous.set(1, { ...previous.get(1)!, loadedFromCache: false });

    const merged = mergeLocalCacheEntriesIntoRendered(
      [
        viewportEntry({
          id: 1,
          latitude: 1.1,
          longitude: 2.1,
          existence_value: 2,
          version: 1,
        }),
        viewportEntry({
          id: 2,
          latitude: 3,
          longitude: 4,
          version: 0,
        }),
      ],
      previous,
    );

    expect(merged.get(1)?.loadedFromCache).toBe(false);
    expect(merged.get(2)?.loadedFromCache).toBe(true);
  });

  test("applyViewportUpsertPreservingLoadedFromCache updates verify_status and preserves cache flag", () => {
    const initial = replaceRenderedBathrooms([
      viewportEntry({
        id: 1,
        latitude: 1,
        longitude: 2,
        existence_value: 0,
        version: 1,
      }),
    ]);
    initial.set(1, { ...initial.get(1)!, loadedFromCache: false });

    const updated = applyViewportUpsertPreservingLoadedFromCache(
      initial,
      viewportEntry({
        id: 1,
        latitude: 1,
        longitude: 2,
        existence_value: 2,
        version: 2,
      }),
    );

    expect(updated.get(1)?.loadedFromCache).toBe(false);
    expect(updated.get(1)?.verify_status).toBe("verified");
  });
});
