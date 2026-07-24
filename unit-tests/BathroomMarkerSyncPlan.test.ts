import {
  isBeyondDestroyDistanceFromViewportCenter,
  planBathroomMarkerSync,
  wgs84SurfaceDistanceMeters,
  type BathroomMarkerPoolRecordWithTint,
} from "../app/_client/pure/bathroom/BathroomMarkerSyncPlan";
import {
  createRenderedBathroomMap,
  type RenderedBathroomEntry,
} from "../app/_client/pure/bathroom/RenderedBathrooms";
import { BathroomMapMarker } from "../app/_client/ComponentConstants";

const bounds = {
  lowerLeft: { latitude: 47.6, longitude: -122.35 },
  upperRight: { latitude: 47.62, longitude: -122.33 },
};

const center = { latitude: 47.61, longitude: -122.34 };
const destroyDistanceM =
  BathroomMapMarker.DESTROY_DISTANCE_FROM_VIEWPORT_CENTER;

function entry(
  overrides: Partial<RenderedBathroomEntry> & Pick<RenderedBathroomEntry, "id">,
): RenderedBathroomEntry {
  return {
    latitude: 47.61,
    longitude: -122.34,
    verify_status: "pending",
    version: 1,
    loadedFromCache: true,
    ...overrides,
  };
}

function poolRecord(
  overrides: Partial<BathroomMarkerPoolRecordWithTint> &
    Pick<BathroomMarkerPoolRecordWithTint, "id">,
): BathroomMarkerPoolRecordWithTint {
  return {
    latitude: 47.61,
    longitude: -122.34,
    verify_status: "pending",
    loadedFromCache: true,
    ...overrides,
  };
}

describe("BathroomMarkerSyncPlan", () => {
  test("wgs84SurfaceDistanceMeters is zero for identical points", () => {
    expect(wgs84SurfaceDistanceMeters(center, center)).toBe(0);
  });

  test("plans create for new rendered bathrooms", () => {
    const current = [entry({ id: 1 })];
    const plan = planBathroomMarkerSync(
      current,
      undefined,
      new Map(),
      center,
      bounds,
      destroyDistanceM,
    );

    expect(plan.create).toEqual(current);
    expect(plan.showIds).toEqual(new Set([1]));
    expect(plan.destroyIds).toEqual(new Set());
  });

  test("leaves same id and verify_status unchanged", () => {
    const current = [entry({ id: 1, verify_status: "verified" })];
    const previous = createRenderedBathroomMap([
      {
        id: 1,
        latitude: 47.61,
        longitude: -122.34,
        verify_status: "verified",
        version: 1,
      },
    ]);
    const pool = new Map<number, BathroomMarkerPoolRecordWithTint>([
      [1, poolRecord({ id: 1, verify_status: "verified" })],
    ]);

    const plan = planBathroomMarkerSync(
      current,
      previous,
      pool,
      center,
      bounds,
      destroyDistanceM,
    );

    expect(plan.create).toEqual([]);
    expect(plan.recreate).toEqual([]);
    expect(plan.unchangedIds).toEqual(new Set([1]));
    expect(plan.showIds).toEqual(new Set([1]));
  });

  test("plans recreate when verify_status changes", () => {
    const current = [entry({ id: 1, verify_status: "verified" })];
    const previous = createRenderedBathroomMap([
      {
        id: 1,
        latitude: 47.61,
        longitude: -122.34,
        verify_status: "pending",
        version: 1,
      },
    ]);
    const pool = new Map<number, BathroomMarkerPoolRecordWithTint>([
      [1, poolRecord({ id: 1, verify_status: "pending" })],
    ]);

    const plan = planBathroomMarkerSync(
      current,
      previous,
      pool,
      center,
      bounds,
      destroyDistanceM,
    );

    expect(plan.recreate).toEqual(current);
    expect(plan.unchangedIds).toEqual(new Set());
  });

  test("hides pooled markers that left the rendered set but stay within destroy distance", () => {
    const pool = new Map<number, BathroomMarkerPoolRecordWithTint>([
      [9, poolRecord({ id: 9, latitude: 47.6105, longitude: -122.3405 })],
    ]);

    const plan = planBathroomMarkerSync(
      [],
      undefined,
      pool,
      center,
      bounds,
      destroyDistanceM,
    );

    expect(plan.hideIds).toEqual(new Set([9]));
    expect(plan.destroyIds).toEqual(new Set());
  });

  test("destroys pooled markers beyond destroy distance from viewport center", () => {
    const pool = new Map<number, BathroomMarkerPoolRecordWithTint>([
      [9, poolRecord({ id: 9, latitude: 49.1, longitude: -122.34 })],
    ]);

    const plan = planBathroomMarkerSync(
      [],
      undefined,
      pool,
      center,
      bounds,
      destroyDistanceM,
    );

    expect(plan.destroyIds).toEqual(new Set([9]));
    expect(plan.hideIds).toEqual(new Set());
  });

  test("isBeyondDestroyDistanceFromViewportCenter returns false without a center", () => {
    expect(
      isBeyondDestroyDistanceFromViewportCenter(
        { latitude: 90, longitude: 0 },
        null,
        destroyDistanceM,
      ),
    ).toBe(false);
  });

  test("plans tint updates when loadedFromCache changes but verify_status matches", () => {
    const current = [entry({ id: 1, loadedFromCache: false })];
    const previous = createRenderedBathroomMap([
      {
        id: 1,
        latitude: 47.61,
        longitude: -122.34,
        verify_status: "pending",
        version: 1,
      },
    ]);
    const pool = new Map<number, BathroomMarkerPoolRecordWithTint>([
      [1, poolRecord({ id: 1, loadedFromCache: true })],
    ]);

    const plan = planBathroomMarkerSync(
      current,
      previous,
      pool,
      center,
      bounds,
      destroyDistanceM,
    );

    expect(plan.unchangedIds).toEqual(new Set([1]));
    expect(plan.tintUpdate).toEqual(current);
    expect(plan.recreate).toEqual([]);
  });
});
