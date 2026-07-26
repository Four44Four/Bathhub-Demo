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

/** Columns on {@link BATHROOM_LOCAL_CACHE_TABLE_NAME} per bathroom_db_reading.md. */
export const REQUIRED_LOCAL_CACHE_COLUMNS = [
  "remote_id",
  "location",
  "version",
  "exists_value",
  "deletion_wait_started_flag",
] as const;

export type RequiredLocalCacheTable =
  (typeof REQUIRED_LOCAL_CACHE_TABLES)[number];

export type RequiredLocalCacheColumn =
  (typeof REQUIRED_LOCAL_CACHE_COLUMNS)[number];

export function missingRequiredLocalCacheTables(
  existingTableNames: readonly string[],
): RequiredLocalCacheTable[] {
  const existing = new Set(existingTableNames);
  return REQUIRED_LOCAL_CACHE_TABLES.filter((name) => !existing.has(name));
}

export function missingRequiredLocalCacheColumns(
  existingColumnNames: readonly string[],
): RequiredLocalCacheColumn[] {
  const existing = new Set(existingColumnNames);
  return REQUIRED_LOCAL_CACHE_COLUMNS.filter((name) => !existing.has(name));
}

export function isLocalCacheSchemaReady(
  existingTableNames: readonly string[],
  cacheTableColumns?: readonly string[],
): boolean {
  if (missingRequiredLocalCacheTables(existingTableNames).length > 0) {
    return false;
  }
  if (cacheTableColumns === undefined) {
    return true;
  }
  return missingRequiredLocalCacheColumns(cacheTableColumns).length === 0;
}
