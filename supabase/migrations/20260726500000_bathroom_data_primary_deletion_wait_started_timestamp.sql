-- Adds deletion_wait_started_timestamp and excludes pending-deletion bathrooms from daily decay.
-- Server schema version 18.

BEGIN;

ALTER TABLE bathroom_data_primary
    ADD COLUMN IF NOT EXISTS deletion_wait_started_timestamp TIMESTAMP;

CREATE OR REPLACE FUNCTION decay_bathroom_data_primary_existence_value()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated_count integer;
BEGIN
    UPDATE bathroom_data_primary
    SET existence_value = existence_value * 0.995
    WHERE deletion_wait_started_timestamp IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION decay_bathroom_data_primary_existence_value()
    TO anon, authenticated, service_role;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 18)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
