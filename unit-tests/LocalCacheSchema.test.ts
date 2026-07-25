import {
  isLocalCacheSchemaReady,
  missingRequiredLocalCacheColumns,
  missingRequiredLocalCacheTables,
  REQUIRED_LOCAL_CACHE_COLUMNS,
  REQUIRED_LOCAL_CACHE_TABLES,
} from "../app/_client/pure/bathroom/LocalCacheSchema";

describe("LocalCacheSchema", () => {
  test("missingRequiredLocalCacheTables reports absent GeoPackage and cache tables", () => {
    expect(missingRequiredLocalCacheTables([])).toEqual([
      ...REQUIRED_LOCAL_CACHE_TABLES,
    ]);
    expect(
      missingRequiredLocalCacheTables([
        "gpkg_spatial_ref_sys",
        "gpkg_contents",
        "gpkg_geometry_columns",
        "bathroom_data_primary_cache",
      ]),
    ).toEqual(["rtree_bathroom_data_primary_cache_location"]);
  });

  test("missingRequiredLocalCacheColumns reports absent exists_value column", () => {
    expect(missingRequiredLocalCacheColumns([])).toEqual([
      ...REQUIRED_LOCAL_CACHE_COLUMNS,
    ]);
    expect(
      missingRequiredLocalCacheColumns([
        "remote_id",
        "location",
        "version",
        "verify_status",
      ]),
    ).toEqual(["exists_value"]);
  });

  test("isLocalCacheSchemaReady is true only when every required table exists", () => {
    expect(isLocalCacheSchemaReady([...REQUIRED_LOCAL_CACHE_TABLES])).toBe(
      true,
    );
    expect(isLocalCacheSchemaReady(["bathroom_data_primary_cache"])).toBe(
      false,
    );
  });

  test("isLocalCacheSchemaReady requires exists_value column on the cache table", () => {
    expect(
      isLocalCacheSchemaReady(
        [...REQUIRED_LOCAL_CACHE_TABLES],
        [...REQUIRED_LOCAL_CACHE_COLUMNS, "updated_at"],
      ),
    ).toBe(true);
    expect(
      isLocalCacheSchemaReady(
        [...REQUIRED_LOCAL_CACHE_TABLES],
        ["remote_id", "location", "version", "verify_status", "updated_at"],
      ),
    ).toBe(false);
  });
});
