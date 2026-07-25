-- Vote-against is a no-op while a bathroom is pending deletion.
-- Server schema version 22.

BEGIN;

DROP FUNCTION IF EXISTS increment_bathroom_data_primary_existence_vote_count(
    bigint,
    boolean
);

CREATE OR REPLACE FUNCTION increment_bathroom_data_primary_existence_vote_count(
    p_id bigint,
    p_vote_for_exists boolean
)
RETURNS TABLE (
    id bigint,
    latitude double precision,
    longitude double precision,
    existence_value real,
    deletion_wait_started_timestamp timestamp,
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
AS $$
BEGIN
    IF p_id IS NULL OR p_id <= 0 THEN
        RAISE EXCEPTION 'invalid bathroom id';
    END IF;

    IF p_vote_for_exists IS NULL THEN
        RAISE EXCEPTION 'invalid existence vote';
    END IF;

    RETURN QUERY
    WITH updated AS (
        UPDATE bathroom_data_primary b
        SET
            existence_value = CASE
                WHEN p_vote_for_exists THEN b.existence_value + 1.0
                WHEN NOT p_vote_for_exists
                    AND b.deletion_wait_started_timestamp IS NOT NULL THEN
                    b.existence_value
                ELSE b.existence_value - 1.0
            END,
            deletion_wait_started_timestamp = CASE
                WHEN p_vote_for_exists AND b.deletion_wait_started_timestamp IS NOT NULL THEN
                    NULL
                WHEN NOT p_vote_for_exists
                    AND b.deletion_wait_started_timestamp IS NULL
                    AND (b.existence_value - 1.0) <= -10.0 THEN
                    CURRENT_TIMESTAMP
                ELSE
                    b.deletion_wait_started_timestamp
            END,
            version = CASE
                WHEN NOT p_vote_for_exists
                    AND b.deletion_wait_started_timestamp IS NOT NULL THEN
                    b.version
                ELSE b.version + 1
            END
        WHERE b.id = p_id
        RETURNING b.*
    )
    SELECT
        updated.id,
        ST_Y(updated.location::geometry) AS latitude,
        ST_X(updated.location::geometry) AS longitude,
        updated.existence_value,
        updated.deletion_wait_started_timestamp,
        updated.temp_data,
        updated.created_at,
        updated.version,
        updated.rating_1_count,
        updated.rating_2_count,
        updated.rating_3_count,
        updated.rating_4_count,
        updated.rating_5_count
    FROM updated;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_bathroom_data_primary_existence_vote_count(
    bigint,
    boolean
) TO anon, authenticated, service_role;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 22)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
