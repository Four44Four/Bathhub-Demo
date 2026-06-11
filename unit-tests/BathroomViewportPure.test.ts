import {
  applyDeletesToRenderedBathrooms,
  applyUpsertsToRenderedBathrooms,
  mergeLocalCacheEntriesIntoRendered,
  replaceRenderedBathrooms,
} from "../app/_client/pure/bathroom/RenderedBathrooms";
import {
  isCameraCloseEnoughForBathroomQuery,
  isGlobeViewportCameraSampleReady,
} from "../app/_client/pure/bathroom/BathroomViewportQuery";

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
      {
        id: 1,
        latitude: 1,
        longitude: 2,
        verify_status: "pending",
        version: 0,
      },
    ]);

    expect(initial.get(1)?.loadedFromCache).toBe(true);

    const withUpsert = applyUpsertsToRenderedBathrooms(
      initial,
      [
        {
          id: 2,
          latitude: 3,
          longitude: 4,
          verify_status: "verified",
          version: 1,
        },
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
      {
        id: 1,
        latitude: 1,
        longitude: 2,
        verify_status: "pending",
        version: 0,
      },
    ]);

    const withStaleUpsert = applyUpsertsToRenderedBathrooms(
      initial,
      [
        {
          id: 1,
          latitude: 1,
          longitude: 2,
          verify_status: "verified",
          version: 2,
        },
      ],
      new Set([1]),
    );

    expect(withStaleUpsert.get(1)?.loadedFromCache).toBe(true);
    expect(withStaleUpsert.get(1)?.verify_status).toBe("verified");
  });

  test("mergeLocalCacheEntriesIntoRendered preserves remote-fetch debug flags", () => {
    const previous = replaceRenderedBathrooms([
      {
        id: 1,
        latitude: 1,
        longitude: 2,
        verify_status: "verified",
        version: 1,
      },
    ]);
    previous.set(1, { ...previous.get(1)!, loadedFromCache: false });

    const merged = mergeLocalCacheEntriesIntoRendered(
      [
        {
          id: 1,
          latitude: 1.1,
          longitude: 2.1,
          verify_status: "verified",
          version: 1,
        },
        {
          id: 2,
          latitude: 3,
          longitude: 4,
          verify_status: "pending",
          version: 0,
        },
      ],
      previous,
    );

    expect(merged.get(1)?.loadedFromCache).toBe(false);
    expect(merged.get(2)?.loadedFromCache).toBe(true);
  });
});
