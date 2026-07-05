import { createClient } from "@supabase/supabase-js";

import {
  type BathroomClientCacheEntry,
  type BathroomDataPrimaryRow,
  type BathroomSyncResponse,
  type BathroomViewportEntry,
  type ViewportBounds,
} from "../app/_shared/BathroomDataPrimary";
import { BathroomMapMarker } from "../app/_client/ComponentConstants";
import { type BathroomLocalDbPort } from "../app/_client/local-db/LocalDbPort";
import {
  type RenderedBathroomMap,
} from "../app/_client/pure/bathroom/RenderedBathrooms";
import {
  runBathroomViewportSyncForGlobe,
  type BathroomViewportSyncRemoteFn,
} from "../app/_client/bathroom/BathroomViewportSync";
import {
  runBathroomViewportLocalSync,
  runBathroomViewportRemoteSync,
} from "../app/_client/pure/bathroom/BathroomViewportSyncPipeline";
import {
  initialRemoteSyncGateState,
  remoteSyncCompleted,
  remoteSyncStarted,
  shouldAllowNewRemoteRequest,
  type RemoteSyncGateState,
} from "../app/_client/pure/bathroom/BathroomViewportRemoteGate";
import { BathroomRemoteDB } from "../app/_client/ComponentConstants";
import { syncInBounds } from "../app/_server/database/bathroom-data-primary/CrudCore";
import { type InputCoordinate } from "./formatCrudReport";
import { requireLocalSupabaseEnv } from "./requireLocalSupabase";

export const COORD_EPSILON = 1e-5;

export const WORLD_BOUNDS: ViewportBounds = {
  lowerLeft: { latitude: -90, longitude: -180 },
  upperRight: { latitude: 90, longitude: 180 },
};

export function boundsAround(
  latitude: number,
  longitude: number,
  delta = 0.02,
): ViewportBounds {
  return {
    lowerLeft: {
      latitude: latitude - delta,
      longitude: longitude - delta,
    },
    upperRight: {
      latitude: latitude + delta,
      longitude: longitude + delta,
    },
  };
}

export function nearlyEqual(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= COORD_EPSILON;
}

export function findSeededRow(
  seededRows: BathroomDataPrimaryRow[],
  locations: InputCoordinate[],
  label: string,
): BathroomDataPrimaryRow {
  const expected = locations.find((location) => location.label === label);
  if (expected === undefined) {
    throw new Error(`locations.json is missing label ${label}`);
  }

  const row = seededRows.find(
    (candidate) =>
      nearlyEqual(candidate.latitude, expected.latitude) &&
      nearlyEqual(candidate.longitude, expected.longitude),
  );

  if (row === undefined) {
    throw new Error(
      `No seeded bathroom_data_primary row found for ${label}; run Crud.integration.test.ts first`,
    );
  }

  return row;
}

export async function setBathroomVersion(
  id: number,
  version: number,
): Promise<void> {
  const env = requireLocalSupabaseEnv();
  const serviceRoleKey = process.env.SERVICE_ROLE_KEY;
  if (serviceRoleKey === undefined || serviceRoleKey.length === 0) {
    throw new Error(
      "SERVICE_ROLE_KEY is required to bump bathroom version in integration tests",
    );
  }

  const admin = createClient(env.url, serviceRoleKey);
  const { error } = await admin
    .from("bathroom_data_primary")
    .update({ version })
    .eq("id", id);

  if (error !== null) {
    throw new Error(`Failed to set bathroom version: ${error.message}`);
  }
}

export type ViewportSyncResult = {
  rendered: RenderedBathroomMap;
  syncResponse: BathroomSyncResponse;
  remoteError: string | null;
};

export type RunViewportCacheSyncOptions = {
  syncRemote?: BathroomViewportSyncRemoteFn;
  cameraHeightM?: number;
  maxQueryCameraHeightM?: number;
  localOnly?: boolean;
};

export type RunViewportLocalSyncResult = {
  rendered: RenderedBathroomMap;
  requestId: number;
};

export async function runViewportLocalCacheSync(
  localDb: BathroomLocalDbPort,
  bounds: ViewportBounds,
  requestId = 1,
  isRequestCurrent: (activeRequestId: number) => boolean = (activeRequestId) =>
    activeRequestId === requestId,
  previousRendered?: RenderedBathroomMap,
): Promise<RunViewportLocalSyncResult> {
  let rendered: RenderedBathroomMap = new Map();

  const nextRendered = await runBathroomViewportLocalSync({
    requestId,
    bounds,
    localDbPort: localDb,
    isRequestCurrent,
    previousRendered,
    onRenderedBathroomsChange: (next) => {
      rendered = next;
    },
  });

  if (nextRendered === null) {
    throw new Error("Local viewport sync was cancelled before rendering");
  }

  return { rendered: nextRendered, requestId };
}

export type RunViewportRemoteSyncResult = {
  rendered: RenderedBathroomMap;
  syncResponse: BathroomSyncResponse;
  remoteError: string | null;
};

export async function runViewportRemoteCacheSync(
  localDb: BathroomLocalDbPort,
  bounds: ViewportBounds,
  initialRendered: RenderedBathroomMap,
  options?: {
    requestId?: number;
    isRequestCurrent?: (activeRequestId: number) => boolean;
    syncRemote?: BathroomViewportSyncRemoteFn;
  },
): Promise<RunViewportRemoteSyncResult> {
  const requestId = options?.requestId ?? 1;
  let rendered = initialRendered;
  let syncResponse: BathroomSyncResponse = { upserts: [], deleteIds: [] };
  let remoteError: string | null = null;
  const syncRemote = options?.syncRemote ?? syncBathroomsInBoundsForIntegration;

  await runBathroomViewportRemoteSync({
    requestId,
    bounds,
    localDbPort: localDb,
    isRequestCurrent:
      options?.isRequestCurrent ??
      ((activeRequestId) => activeRequestId === requestId),
    initialRendered,
    syncRemote: async (viewportBounds, clientCache) => {
      const result = await syncRemote(viewportBounds, clientCache);
      if (result.val) {
        syncResponse = result.val;
      }
      return result;
    },
    onRenderedBathroomsChange: (nextRendered) => {
      rendered = nextRendered;
    },
    onRemoteSyncError: (errorMsg) => {
      remoteError = errorMsg;
    },
  });

  return { rendered, syncResponse, remoteError };
}

export function simulateRemoteGateRetry(
  gate: RemoteSyncGateState,
  nowMs: number,
  readRetryMs: number = BathroomRemoteDB.READ_RETRY_MS,
): { allowRetry: boolean; nextGate: RemoteSyncGateState } {
  const allowRetry = shouldAllowNewRemoteRequest(gate, nowMs, readRetryMs);
  return {
    allowRetry,
    nextGate: allowRetry ? remoteSyncStarted(nowMs) : gate,
  };
}

export function idleRemoteGate(): RemoteSyncGateState {
  return initialRemoteSyncGateState();
}

export function completedRemoteGate(): RemoteSyncGateState {
  return remoteSyncCompleted();
}

export async function runViewportCacheSync(
  localDb: BathroomLocalDbPort,
  bounds: ViewportBounds,
  options?: RunViewportCacheSyncOptions,
): Promise<ViewportSyncResult> {
  let rendered: RenderedBathroomMap = new Map();
  let syncResponse: BathroomSyncResponse = { upserts: [], deleteIds: [] };
  let remoteError: string | null = null;
  const requestId = 1;
  const maxHeight =
    options?.maxQueryCameraHeightM ?? BathroomMapMarker.MAX_QUERY_CAMERA_HEIGHT_M;
  const cameraHeightM = options?.cameraHeightM ?? maxHeight - 1;
  const syncRemote = options?.syncRemote ?? syncBathroomsInBoundsForIntegration;

  await runBathroomViewportSyncForGlobe({
    globe: {
      getCameraHeightM: () => cameraHeightM,
      getViewportBoundsLatLon: () => bounds,
    },
    requestId,
    maxQueryCameraHeightM: maxHeight,
    localDbPort: localDb,
    localOnly: options?.localOnly,
    isRequestCurrent: (activeRequestId) => activeRequestId === requestId,
    syncRemote: async (viewportBounds, clientCache) => {
      const result = await syncRemote(viewportBounds, clientCache);
      if (result.val) {
        syncResponse = result.val;
      }
      return result;
    },
    onRenderedBathroomsChange: (nextRendered) => {
      rendered = nextRendered;
    },
    onClearBathrooms: () => {
      rendered = new Map();
      syncResponse = { upserts: [], deleteIds: [] };
    },
    onRemoteSyncError: (errorMsg) => {
      remoteError = errorMsg;
    },
  });

  return { rendered, syncResponse, remoteError };
}

async function syncBathroomsInBoundsForIntegration(
  bounds: ViewportBounds,
  clientCache: BathroomClientCacheEntry[],
): Promise<{ val: BathroomSyncResponse | null; errorMsg?: string }> {
  try {
    return { val: await syncInBounds(bounds, clientCache) };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }
}

export function expectViewportEntryMatchesRow(
  entry: BathroomViewportEntry | undefined,
  row: BathroomDataPrimaryRow,
): void {
  expect(entry).toBeDefined();
  expect(entry?.id).toBe(row.id);
  expect(nearlyEqual(entry?.latitude ?? 0, row.latitude)).toBe(true);
  expect(nearlyEqual(entry?.longitude ?? 0, row.longitude)).toBe(true);
  expect(entry?.verify_status).toBe(row.verify_status);
  expect(entry?.version).toBe(row.version);
}

export function expectClientCacheEntry(
  cache: BathroomClientCacheEntry[],
  row: BathroomDataPrimaryRow,
): void {
  expect(cache).toContainEqual({ id: row.id, version: row.version });
}
