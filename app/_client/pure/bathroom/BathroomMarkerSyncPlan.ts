import { type ViewportBounds } from "../../../_shared/BathroomDataPrimary";
import { isPointInViewportBounds } from "./BathroomViewportQuery";
import { type RenderedBathroomEntry, type RenderedBathroomMap } from "./RenderedBathrooms";

const WGS84_MEAN_EARTH_RADIUS_M = 6_371_000;

export type LatLonPoint = {
  latitude: number;
  longitude: number;
};

export type BathroomMarkerPoolRecord = {
  id: number;
  latitude: number;
  longitude: number;
  verify_status: RenderedBathroomEntry["verify_status"];
};

export type BathroomMarkerSyncPlan = {
  create: RenderedBathroomEntry[];
  recreate: RenderedBathroomEntry[];
  showIds: ReadonlySet<number>;
  hideIds: ReadonlySet<number>;
  destroyIds: ReadonlySet<number>;
  unchangedIds: ReadonlySet<number>;
  /** Same id and verify_status; tint may still need a debug update. */
  tintUpdate: RenderedBathroomEntry[];
};

/** Great-circle distance on the WGS84 mean Earth sphere (meters). */
export function wgs84SurfaceDistanceMeters(
  a: LatLonPoint,
  b: LatLonPoint,
): number {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);
  const haversine =
    sinHalfDLat * sinHalfDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfDLon * sinHalfDLon;

  return 2 * WGS84_MEAN_EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function isBeyondDestroyDistanceFromViewportCenter(
  marker: LatLonPoint,
  viewportCenter: LatLonPoint | null | undefined,
  destroyDistanceFromCenterM: number,
): boolean {
  if (viewportCenter === null || viewportCenter === undefined) {
    return false;
  }
  if (!Number.isFinite(destroyDistanceFromCenterM) || destroyDistanceFromCenterM <= 0) {
    return false;
  }
  return (
    wgs84SurfaceDistanceMeters(marker, viewportCenter) > destroyDistanceFromCenterM
  );
}

function renderedEntryNeedsTintUpdate(
  poolRecord: BathroomMarkerPoolRecordWithTint,
  entry: RenderedBathroomEntry,
): boolean {
  return poolRecord.loadedFromCache !== entry.loadedFromCache;
}

/** @internal exported for tests — extends pool record with tint metadata. */
export type BathroomMarkerPoolRecordWithTint = BathroomMarkerPoolRecord & {
  loadedFromCache: boolean;
};

export function planBathroomMarkerSync(
  current: readonly RenderedBathroomEntry[],
  previous: RenderedBathroomMap | undefined,
  pool: ReadonlyMap<number, BathroomMarkerPoolRecordWithTint>,
  viewportCenter: LatLonPoint | null | undefined,
  viewportBounds: ViewportBounds,
  destroyDistanceFromCenterM: number,
): BathroomMarkerSyncPlan {
  const currentById = new Map(current.map((entry) => [entry.id, entry] as const));
  const create: RenderedBathroomEntry[] = [];
  const recreate: RenderedBathroomEntry[] = [];
  const showIds = new Set<number>();
  const hideIds = new Set<number>();
  const destroyIds = new Set<number>();
  const unchangedIds = new Set<number>();
  const tintUpdate: RenderedBathroomEntry[] = [];

  for (const entry of current) {
    const previousEntry = previous?.get(entry.id);
    const poolRecord = pool.get(entry.id);

    if (!poolRecord) {
      create.push(entry);
      showIds.add(entry.id);
      continue;
    }

    const statusChanged =
      (previousEntry !== undefined &&
        previousEntry.verify_status !== entry.verify_status) ||
      poolRecord.verify_status !== entry.verify_status;

    if (statusChanged) {
      recreate.push(entry);
      showIds.add(entry.id);
      continue;
    }

    unchangedIds.add(entry.id);
    if (renderedEntryNeedsTintUpdate(poolRecord, entry)) {
      tintUpdate.push(entry);
    }
    if (
      isPointInViewportBounds(
        viewportBounds,
        entry.latitude,
        entry.longitude,
      )
    ) {
      showIds.add(entry.id);
    } else {
      hideIds.add(entry.id);
    }
  }

  for (const [id, poolRecord] of pool) {
    if (currentById.has(id)) {
      continue;
    }

    const markerPoint: LatLonPoint = {
      latitude: poolRecord.latitude,
      longitude: poolRecord.longitude,
    };

    if (
      isBeyondDestroyDistanceFromViewportCenter(
        markerPoint,
        viewportCenter,
        destroyDistanceFromCenterM,
      )
    ) {
      destroyIds.add(id);
      continue;
    }

    hideIds.add(id);
  }

  return {
    create,
    recreate,
    showIds,
    hideIds,
    destroyIds,
    unchangedIds,
    tintUpdate,
  };
}
