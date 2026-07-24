"use server";

import {
  type BathroomClientCacheEntry,
  type BathroomDataPrimaryFullRow,
  type BathroomDataPrimaryRow,
  type BathroomSyncResponse,
  type LatLong,
  type VerifyStatus,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";
import { type Errorable } from "../../../_shared/Utils";
import {
  type FindNearestBathroomConstraints,
  type NearestBathroomClientPayload,
  toNearestBathroomClientPayload,
} from "../../pure/bathroom-data-primary/FindNearestBathroom";
import { tryEnforceServerRateLimit } from "../../rate-limit/enforceRateLimit";
import * as Core from "./CrudCore";

export async function bathroomDbCreate(
  latitude: number,
  longitude: number,
): Promise<Errorable<BathroomDataPrimaryRow>> {
  const rateLimit = await tryEnforceServerRateLimit("bathroom-create");
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }

  try {
    return { val: await Core.createAt(latitude, longitude) };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function bathroomDbIncrementRating(
  id: number,
  stars: number,
): Promise<Errorable<BathroomDataPrimaryFullRow>> {
  const rateLimit = await tryEnforceServerRateLimit("bathroom-update");
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }

  try {
    return { val: await Core.incrementRatingCount(id, stars) };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function bathroomDbUpdateVerifyStatus(
  id: number,
  verifyStatus: VerifyStatus,
): Promise<Errorable<BathroomDataPrimaryRow>> {
  const rateLimit = await tryEnforceServerRateLimit("bathroom-update");
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }

  try {
    return { val: await Core.updateVerifyStatus(id, verifyStatus) };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function bathroomDbReadInBounds(
  bounds: ViewportBounds,
): Promise<BathroomDataPrimaryRow[]> {
  const rateLimit = await tryEnforceServerRateLimit("bathroom-read-sync");
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.message);
  }

  return Core.getInBounds(bounds);
}

export async function bathroomDbReadById(
  id: number,
): Promise<Errorable<BathroomDataPrimaryFullRow>> {
  const rateLimit = await tryEnforceServerRateLimit("bathroom-read-by-id");
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }

  try {
    const row = await Core.getById(id);
    if (row === null) {
      return { val: null, errorMsg: "bathroom not found" };
    }
    return { val: row };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function bathroomDbSyncInBounds(
  bounds: ViewportBounds,
  clientCache: BathroomClientCacheEntry[],
): Promise<BathroomSyncResponse> {
  const rateLimit = await tryEnforceServerRateLimit("bathroom-read-sync");
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.message);
  }

  return Core.syncInBounds(bounds, clientCache);
}

export async function bathroomDbFindNearest(
  location: LatLong,
  constraints: FindNearestBathroomConstraints,
): Promise<NearestBathroomClientPayload | null> {
  const rateLimit = await tryEnforceServerRateLimit("bathroom-find-nearest");
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.message);
  }

  const row = await Core.findNearest(location, constraints);
  if (!row) return null;
  return toNearestBathroomClientPayload(row);
}
