"use server";

import {
  type BathroomClientCacheEntry,
  type BathroomDataPrimaryRow,
  type BathroomSyncResponse,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";
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
