import { BATHROOM_LOCAL_CACHE_TABLE_NAME } from "../../../_shared/BathroomDataPrimary";

export const GPKG_SPATIAL_REF_SYS_TABLE = "gpkg_spatial_ref_sys" as const;
export const GPKG_CONTENTS_TABLE = "gpkg_contents" as const;
export const GPKG_GEOMETRY_COLUMNS_TABLE = "gpkg_geometry_columns" as const;

export const RTREE_TABLE_NAME =
  `rtree_${BATHROOM_LOCAL_CACHE_TABLE_NAME}_location` as const;

/** GeoPackage + cache tables that must exist before the local DB is used. */
export const REQUIRED_LOCAL_CACHE_TABLES = [
  GPKG_SPATIAL_REF_SYS_TABLE,
  GPKG_CONTENTS_TABLE,
  GPKG_GEOMETRY_COLUMNS_TABLE,
  BATHROOM_LOCAL_CACHE_TABLE_NAME,
  RTREE_TABLE_NAME,
] as const;

export type RequiredLocalCacheTable =
  (typeof REQUIRED_LOCAL_CACHE_TABLES)[number];

export function missingRequiredLocalCacheTables(
  existingTableNames: readonly string[],
): RequiredLocalCacheTable[] {
  const existing = new Set(existingTableNames);
  return REQUIRED_LOCAL_CACHE_TABLES.filter((name) => !existing.has(name));
}

export function isLocalCacheSchemaReady(
  existingTableNames: readonly string[],
): boolean {
  return missingRequiredLocalCacheTables(existingTableNames).length === 0;
}
