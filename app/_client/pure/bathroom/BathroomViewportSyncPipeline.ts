import { type Errorable } from "../../../_shared/Utils";
import {
  type BathroomClientCacheEntry,
  type BathroomSyncResponse,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";
import { type BathroomLocalDbPort } from "../../local-db/LocalDbPort";
import {
  applyDeletesToRenderedBathrooms,
  applyUpsertsToRenderedBathrooms,
  cachedIdsFromClientCache,
  mergeLocalCacheEntriesIntoRendered,
  type RenderedBathroomMap,
} from "./RenderedBathrooms";

export type BathroomViewportLocalSyncDeps = {
  requestId: number;
  bounds: ViewportBounds;
  localDbPort: BathroomLocalDbPort;
  isRequestCurrent: (requestId: number) => boolean;
  onRenderedBathroomsChange: (rendered: RenderedBathroomMap) => void;
  /** Prior rendered state; used to preserve remote-fetch debug flags across local re-reads. */
  previousRendered?: RenderedBathroomMap;
};

export type BathroomViewportRemoteSyncDeps = {
  requestId: number;
  bounds: ViewportBounds;
  localDbPort: BathroomLocalDbPort;
  isRequestCurrent: (requestId: number) => boolean;
  syncRemote: (
    bounds: ViewportBounds,
    clientCache: BathroomClientCacheEntry[],
  ) => Promise<Errorable<BathroomSyncResponse>>;
  onRenderedBathroomsChange: (rendered: RenderedBathroomMap) => void;
  onRemoteSyncError?: (errorMsg: string) => void;
  initialRendered: RenderedBathroomMap;
};

export type BathroomViewportSyncPipelineDeps = BathroomViewportLocalSyncDeps &
  Pick<
    BathroomViewportRemoteSyncDeps,
    "syncRemote" | "onRemoteSyncError"
  >;

export async function runBathroomViewportLocalSync(
  deps: BathroomViewportLocalSyncDeps,
): Promise<RenderedBathroomMap | null> {
  await deps.localDbPort.init();
  const localEntries = await deps.localDbPort.getInBounds(deps.bounds);
  if (!deps.isRequestCurrent(deps.requestId)) {
    return null;
  }

  const rendered = mergeLocalCacheEntriesIntoRendered(
    localEntries,
    deps.previousRendered,
  );
  deps.onRenderedBathroomsChange(rendered);
  return rendered;
}

export async function runBathroomViewportRemoteSync(
  deps: BathroomViewportRemoteSyncDeps,
): Promise<void> {
  let rendered = deps.initialRendered;

  const clientCache = await deps.localDbPort.getIdVersionPairsInBounds(deps.bounds);
  if (!deps.isRequestCurrent(deps.requestId)) {
    return;
  }

  const result = await deps.syncRemote(deps.bounds, clientCache);
  if (!deps.isRequestCurrent(deps.requestId)) {
    return;
  }

  if (!result.val) {
    if (result.errorMsg) {
      deps.onRemoteSyncError?.(result.errorMsg);
    }
    // Keep local bathrooms visible even when remote sync fails.
    deps.onRenderedBathroomsChange(rendered);
    return;
  }

  const { upserts, deleteIds } = result.val;
  const cachedIdsBeforeUpsert = cachedIdsFromClientCache(clientCache);

  if (upserts.length > 0) {
    await deps.localDbPort.upsertMany(upserts);
    rendered = applyUpsertsToRenderedBathrooms(
      rendered,
      upserts,
      cachedIdsBeforeUpsert,
    );
    if (!deps.isRequestCurrent(deps.requestId)) {
      return;
    }
  }

  if (deleteIds.length > 0) {
    await deps.localDbPort.deleteMany(deleteIds);
    rendered = applyDeletesToRenderedBathrooms(rendered, deleteIds);
    if (!deps.isRequestCurrent(deps.requestId)) {
      return;
    }
  }

  deps.onRenderedBathroomsChange(rendered);
}

export async function runBathroomViewportSyncPipeline(
  deps: BathroomViewportSyncPipelineDeps,
): Promise<void> {
  const rendered = await runBathroomViewportLocalSync(deps);
  if (rendered === null) {
    return;
  }

  await runBathroomViewportRemoteSync({
    ...deps,
    initialRendered: rendered,
  });
}
