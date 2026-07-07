-- Introduce server PostgreSQL schema version tracking at version 9.
-- Version 9 reflects the schema state after the eight prior migrations
-- (through 20260706000000_bathroom_data_primary_h3_cell_rpc).

BEGIN;

CREATE TABLE IF NOT EXISTS server_db_schema_version (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    version INTEGER NOT NULL
);

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 9)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
