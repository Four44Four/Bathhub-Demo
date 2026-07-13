-- Add per-star rating count columns to bathroom_data_primary (bathroom_db spec).
-- Server schema version 10.

BEGIN;

ALTER TABLE bathroom_data_primary
    ADD COLUMN IF NOT EXISTS rating_1_count BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_2_count BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_3_count BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_4_count BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_5_count BIGINT NOT NULL DEFAULT 0;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 10)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
