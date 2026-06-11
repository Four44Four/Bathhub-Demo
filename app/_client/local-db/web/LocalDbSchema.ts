import { BATHROOM_LOCAL_CACHE_TABLE_NAME } from "../../../_shared/BathroomDataPrimary";
import { RTREE_TABLE_NAME } from "../../pure/bathroom/LocalCacheSchema";

export { RTREE_TABLE_NAME };

export const BATHROOM_GPKG_FILENAME = "bathhub_bathroom_cache.gpkg" as const;

export const BATHROOM_LOCAL_DB_SCHEMA_SQL = `
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS gpkg_spatial_ref_sys (
  srs_name TEXT NOT NULL,
  srs_id INTEGER NOT NULL PRIMARY KEY,
  organization TEXT NOT NULL,
  organization_coordsys_id INTEGER NOT NULL,
  definition TEXT NOT NULL,
  description TEXT
);

INSERT OR IGNORE INTO gpkg_spatial_ref_sys (
  srs_name, srs_id, organization, organization_coordsys_id, definition, description
) VALUES (
  'WGS 84 geodetic',
  4326,
  'EPSG',
  4326,
  'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]',
  'longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid'
);

CREATE TABLE IF NOT EXISTS gpkg_contents (
  table_name TEXT NOT NULL PRIMARY KEY,
  data_type TEXT NOT NULL,
  identifier TEXT UNIQUE,
  description TEXT DEFAULT '',
  last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  min_x DOUBLE,
  min_y DOUBLE,
  max_x DOUBLE,
  max_y DOUBLE,
  srs_id INTEGER
);

CREATE TABLE IF NOT EXISTS gpkg_geometry_columns (
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  geometry_type_name TEXT NOT NULL,
  srs_id INTEGER NOT NULL,
  z TINYINT NOT NULL,
  m TINYINT NOT NULL,
  CONSTRAINT pk_geom_cols PRIMARY KEY (table_name, column_name)
);

CREATE TABLE IF NOT EXISTS ${BATHROOM_LOCAL_CACHE_TABLE_NAME} (
  remote_id INTEGER PRIMARY KEY NOT NULL,
  location BLOB NOT NULL,
  version INTEGER NOT NULL,
  verify_status TEXT NOT NULL CHECK (verify_status IN ('pending', 'verified')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO gpkg_contents (
  table_name, data_type, identifier, srs_id
) VALUES (
  '${BATHROOM_LOCAL_CACHE_TABLE_NAME}',
  'features',
  '${BATHROOM_LOCAL_CACHE_TABLE_NAME}',
  4326
);

INSERT OR IGNORE INTO gpkg_geometry_columns (
  table_name, column_name, geometry_type_name, srs_id, z, m
) VALUES (
  '${BATHROOM_LOCAL_CACHE_TABLE_NAME}',
  'location',
  'POINT',
  4326,
  0,
  0
);

CREATE VIRTUAL TABLE IF NOT EXISTS ${RTREE_TABLE_NAME} USING rtree (
  remote_id,
  min_x, max_x,
  min_y, max_y
);
` as const;
