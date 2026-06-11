import {
  type BathroomClientCacheEntry,
  type BathroomViewportEntry,
} from "../../../_shared/BathroomDataPrimary";

export type RenderedBathroomEntry = BathroomViewportEntry & {
  loadedFromCache: boolean;
};

export type RenderedBathroomMap = Map<number, RenderedBathroomEntry>;

function toRenderedEntry(
  entry: BathroomViewportEntry,
  loadedFromCache: boolean,
): RenderedBathroomEntry {
  return { ...entry, loadedFromCache };
}

export function cachedIdsFromClientCache(
  clientCache: BathroomClientCacheEntry[],
): Set<number> {
  return new Set(clientCache.map((entry) => entry.id));
}

export function createRenderedBathroomMap(
  entries: BathroomViewportEntry[] = [],
  loadedFromCache = true,
): RenderedBathroomMap {
  return new Map(
    entries.map((entry) => [entry.id, toRenderedEntry(entry, loadedFromCache)] as const),
  );
}

export function replaceRenderedBathrooms(
  entries: BathroomViewportEntry[],
): RenderedBathroomMap {
  return createRenderedBathroomMap(entries, true);
}

/**
 * Hydrates rendered bathrooms from a local cache read. Preserves
 * `loadedFromCache: false` from a prior remote fetch so debug tinting is not
 * cleared by the next delayed local sync.
 */
export function mergeLocalCacheEntriesIntoRendered(
  entries: BathroomViewportEntry[],
  previousRendered?: RenderedBathroomMap,
): RenderedBathroomMap {
  return new Map(
    entries.map((entry) => {
      const wasFreshFromRemote =
        previousRendered?.get(entry.id)?.loadedFromCache === false;
      return [
        entry.id,
        toRenderedEntry(entry, !wasFreshFromRemote),
      ] as const;
    }),
  );
}

export function applyUpsertsToRenderedBathrooms(
  rendered: RenderedBathroomMap,
  upserts: BathroomViewportEntry[],
  cachedIdsBeforeUpsert: ReadonlySet<number> = new Set(),
): RenderedBathroomMap {
  const next = new Map(rendered);
  for (const entry of upserts) {
    next.set(
      entry.id,
      toRenderedEntry(entry, cachedIdsBeforeUpsert.has(entry.id)),
    );
  }
  return next;
}

export function applyDeletesToRenderedBathrooms(
  rendered: RenderedBathroomMap,
  deleteIds: number[],
): RenderedBathroomMap {
  const next = new Map(rendered);
  for (const id of deleteIds) {
    next.delete(id);
  }
  return next;
}

export function renderedBathroomsToArray(
  rendered: RenderedBathroomMap,
): RenderedBathroomEntry[] {
  return Array.from(rendered.values());
}
