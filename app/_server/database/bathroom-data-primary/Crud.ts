"use server";

import {
  type BathroomClientCacheEntry,
  type BathroomDataPrimaryRow,
  type BathroomSyncResponse,
  type LatLong,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";
import {
  type FindNearestBathroomConstraints,
  type NearestBathroomClientPayload,
  toNearestBathroomClientPayload,
} from "../../pure/bathroom-data-primary/FindNearestBathroom";
import * as Core from "./CrudCore";

export async function bathroomDbCreate(
  latitude: number,
  longitude: number,
): Promise<BathroomDataPrimaryRow> {
  return Core.createAt(latitude, longitude);
}

export async function bathroomDbReadInBounds(
  bounds: ViewportBounds,
): Promise<BathroomDataPrimaryRow[]> {
  return Core.getInBounds(bounds);
}

export async function bathroomDbSyncInBounds(
  bounds: ViewportBounds,
  clientCache: BathroomClientCacheEntry[],
): Promise<BathroomSyncResponse> {
  return Core.syncInBounds(bounds, clientCache);
}

export async function bathroomDbFindNearest(
  location: LatLong,
  constraints: FindNearestBathroomConstraints,
): Promise<NearestBathroomClientPayload | null> {
  const row = await Core.findNearest(location, constraints);
  if (!row) return null;
  return toNearestBathroomClientPayload(row);
}
