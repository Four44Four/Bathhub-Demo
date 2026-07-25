"use client";

import { type RefObject } from "react";

import { type Errorable } from "../_shared/Utils";
import {
  type BathroomClientCacheEntry,
  type BathroomDataPrimaryFullRow,
  type BathroomDataPrimaryRow,
  type BathroomSyncResponse,
  type BathroomViewportEntry,
  type ViewportBounds,
  bathroomDataPrimaryRowToViewportEntry,
  bathroomSyncUpsertToViewportEntry,
} from "../_shared/BathroomDataPrimary";
import * as BathroomCrud from "../_server/database/bathroom-data-primary/Crud";
import { type GlobeViewportHandle } from "./globe/GlobeViewport";

async function toErrorable<T>(run: () => Promise<T>): Promise<Errorable<T>> {
  try {
    return { val: await run() };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }
}

export type BathroomViewportRenderHandler = (
  bathrooms: BathroomViewportEntry[],
) => void;

let bathroomViewportRenderHandler: BathroomViewportRenderHandler | null = null;
let forceBathroomViewportSyncHandler: (() => void) | null = null;
let bathroomViewportUpsertHandler:
  | ((entry: BathroomViewportEntry) => Promise<void> | void)
  | null = null;

/** Registers the callback that renders bathrooms returned from a viewport refresh. */
export function registerBathroomViewportRenderHandler(
  handler: BathroomViewportRenderHandler,
): () => void {
  bathroomViewportRenderHandler = handler;
  return () => {
    if (bathroomViewportRenderHandler === handler) {
      bathroomViewportRenderHandler = null;
    }
  };
}

/** Registers an immediate local+remote bathroom viewport sync (bypasses query delay). */
export function registerForceBathroomViewportSyncHandler(
  handler: () => void,
): () => void {
  forceBathroomViewportSyncHandler = handler;
  return () => {
    if (forceBathroomViewportSyncHandler === handler) {
      forceBathroomViewportSyncHandler = null;
    }
  };
}

/** Registers immediate local-cache + map-marker updates for one bathroom upsert. */
export function registerBathroomViewportUpsertHandler(
  handler: (entry: BathroomViewportEntry) => Promise<void> | void,
): () => void {
  bathroomViewportUpsertHandler = handler;
  return () => {
    if (bathroomViewportUpsertHandler === handler) {
      bathroomViewportUpsertHandler = null;
    }
  };
}

/** Updates the local cache and rendered bathroom map marker for one bathroom row. */
export async function applyBathroomViewportUpsert(
  row: Pick<
    BathroomDataPrimaryRow,
    | "id"
    | "latitude"
    | "longitude"
    | "existence_value"
    | "deletion_wait_started_timestamp"
    | "version"
  >,
): Promise<void> {
  const entry = bathroomDataPrimaryRowToViewportEntry(row);
  await bathroomViewportUpsertHandler?.(entry);
}

/** Re-samples viewport bounds then forces an immediate bathroom query for the visible area. */
export function forceGlobeBathroomViewportQuery(
  globe: { requestViewportResync?: () => void } | null,
): void {
  globe?.requestViewportResync?.();
  forceBathroomViewportSyncHandler?.();
}

export async function createBathroomAt(
  latitude: number,
  longitude: number,
): Promise<Errorable<BathroomDataPrimaryRow>> {
  return BathroomCrud.bathroomDbCreate(latitude, longitude);
}

export async function incrementBathroomRating(
  id: number,
  stars: number,
): Promise<Errorable<BathroomDataPrimaryFullRow>> {
  return BathroomCrud.bathroomDbIncrementRating(id, stars);
}

export async function incrementBathroomExistenceVote(
  id: number,
  voteForExists: boolean,
): Promise<Errorable<BathroomDataPrimaryFullRow>> {
  return BathroomCrud.bathroomDbIncrementExistenceVote(id, voteForExists);
}

export async function readBathroomsInBounds(
  bounds: ViewportBounds,
): Promise<Errorable<BathroomDataPrimaryRow[]>> {
  return toErrorable(() => BathroomCrud.bathroomDbReadInBounds(bounds));
}

export async function readBathroomById(
  id: number,
): Promise<Errorable<BathroomDataPrimaryFullRow>> {
  return BathroomCrud.bathroomDbReadById(id);
}

export async function syncBathroomsInBounds(
  bounds: ViewportBounds,
  clientCache: BathroomClientCacheEntry[],
): Promise<Errorable<BathroomSyncResponse>> {
  return toErrorable(() =>
    BathroomCrud.bathroomDbSyncInBounds(bounds, clientCache),
  );
}

export async function syncBathroomsInGlobeViewport(
  bounds: ViewportBounds,
  clientCache: BathroomClientCacheEntry[],
  renderHandler: BathroomViewportRenderHandler | null = bathroomViewportRenderHandler,
): Promise<Errorable<BathroomSyncResponse>> {
  const result = await syncBathroomsInBounds(bounds, clientCache);
  if (result.val && renderHandler) {
    renderHandler(
      result.val.upserts.map(bathroomSyncUpsertToViewportEntry),
    );
  }
  return result;
}

export async function refreshBathroomsInGlobeViewport(
  globeRef: RefObject<GlobeViewportHandle | null>,
): Promise<void> {
  forceGlobeBathroomViewportQuery(globeRef.current);
}
