"use client";

import { type RefObject } from "react";

import { type Errorable } from "../_shared/Utils";
import {
  type BathroomClientCacheEntry,
  type BathroomDataPrimaryRow,
  type BathroomSyncResponse,
  type BathroomViewportEntry,
  type ViewportBounds,
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

export async function createBathroomAt(
  latitude: number,
  longitude: number,
): Promise<Errorable<BathroomDataPrimaryRow>> {
  return toErrorable(() =>
    BathroomCrud.bathroomDbCreate(latitude, longitude),
  );
}

export async function readBathroomsInBounds(
  bounds: ViewportBounds,
): Promise<Errorable<BathroomDataPrimaryRow[]>> {
  return toErrorable(() => BathroomCrud.bathroomDbReadInBounds(bounds));
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
    renderHandler(result.val.upserts);
  }
  return result;
}

export async function refreshBathroomsInGlobeViewport(
  globeRef: RefObject<GlobeViewportHandle | null>,
): Promise<void> {
  globeRef.current?.requestViewportResync();
}
