-- RPC to fetch a full bathroom_data_primary row by id (bathroom_page spec).
-- Server schema version 11.

BEGIN;

CREATE OR REPLACE FUNCTION get_bathroom_data_primary_by_id(p_id bigint)
RETURNS TABLE (
    id bigint,
    latitude double precision,
    longitude double precision,
    verify_status verify_status,
    temp_data text,
    created_at timestamp,
    version bigint,
    rating_1_count bigint,
    rating_2_count bigint,
    rating_3_count bigint,
    rating_4_count bigint,
    rating_5_count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF p_id IS NULL OR p_id <= 0 THEN
        RAISE EXCEPTION 'invalid bathroom id';
    END IF;

    RETURN QUERY
    SELECT
        b.id,
        ST_Y(b.location::geometry) AS latitude,
        ST_X(b.location::geometry) AS longitude,
        b.verify_status,
        b.temp_data,
        b.created_at,
        b.version,
        b.rating_1_count,
        b.rating_2_count,
        b.rating_3_count,
        b.rating_4_count,
        b.rating_5_count
    FROM bathroom_data_primary b
    WHERE b.id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_bathroom_data_primary_by_id(bigint)
    TO anon, authenticated, service_role;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 11)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
