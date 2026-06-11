import {
  type BathroomClientCacheEntry,
  type BathroomViewportEntry,
  type ViewportBounds,
} from "../../_shared/BathroomDataPrimary";

export type BathroomLocalDbPort = {
  /**
   * Opens the local cache when the client app starts (website visit on web).
   * Verifies GeoPackage tables exist, creates any that are missing, and loads
   * an in-memory WAL database hydrated from the on-disk .gpkg when present.
   */
  init(): Promise<void>;
  getInBounds(bounds: ViewportBounds): Promise<BathroomViewportEntry[]>;
  getIdVersionPairsInBounds(
    bounds: ViewportBounds,
  ): Promise<BathroomClientCacheEntry[]>;
  upsertMany(entries: BathroomViewportEntry[]): Promise<void>;
  deleteMany(ids: number[]): Promise<void>;
};
