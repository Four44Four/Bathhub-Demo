-- Expose deletion_wait_started_timestamp to bathroom read/sync RPCs.
-- Server schema version 20.

BEGIN;

DROP FUNCTION IF EXISTS get_bathroom_data_primary_by_id(bigint);

CREATE OR REPLACE FUNCTION get_bathroom_data_primary_by_id(p_id bigint)
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
        b.existence_value,
        b.deletion_wait_started_timestamp,
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

DROP FUNCTION IF EXISTS increment_bathroom_data_primary_rating_count(bigint, integer);

CREATE OR REPLACE FUNCTION increment_bathroom_data_primary_rating_count(
    p_id bigint,
    p_stars integer
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

    IF p_stars IS NULL OR p_stars < 1 OR p_stars > 5 THEN
        RAISE EXCEPTION 'invalid rating stars';
    END IF;

    RETURN QUERY
    UPDATE bathroom_data_primary b
    SET
        rating_1_count = CASE
            WHEN p_stars = 1 THEN b.rating_1_count + 1
            ELSE b.rating_1_count
        END,
        rating_2_count = CASE
            WHEN p_stars = 2 THEN b.rating_2_count + 1
            ELSE b.rating_2_count
        END,
        rating_3_count = CASE
            WHEN p_stars = 3 THEN b.rating_3_count + 1
            ELSE b.rating_3_count
        END,
        rating_4_count = CASE
            WHEN p_stars = 4 THEN b.rating_4_count + 1
            ELSE b.rating_4_count
        END,
        rating_5_count = CASE
            WHEN p_stars = 5 THEN b.rating_5_count + 1
            ELSE b.rating_5_count
        END,
        version = b.version + 1
    WHERE b.id = p_id
    RETURNING
        b.id,
        ST_Y(b.location::geometry) AS latitude,
        ST_X(b.location::geometry) AS longitude,
        b.existence_value,
        b.deletion_wait_started_timestamp,
        b.temp_data,
        b.created_at,
        b.version,
        b.rating_1_count,
        b.rating_2_count,
        b.rating_3_count,
        b.rating_4_count,
        b.rating_5_count;
END;
$$;

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
            version = b.version + 1
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

CREATE OR REPLACE FUNCTION sync_bathroom_data_primary_in_bbox(
    p_min_longitude double precision,
    p_min_latitude double precision,
    p_max_longitude double precision,
    p_max_latitude double precision,
    p_client_cache jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_result jsonb;
BEGIN
    IF p_min_longitude <> p_min_longitude
        OR p_min_latitude <> p_min_latitude
        OR p_max_longitude <> p_max_longitude
        OR p_max_latitude <> p_max_latitude THEN
        RAISE EXCEPTION 'invalid bbox coordinates';
    END IF;

    WITH remote_rows AS (
        SELECT
            b.id,
            b.version,
            ST_Y(b.location::geometry) AS latitude,
            ST_X(b.location::geometry) AS longitude,
            b.existence_value,
            b.deletion_wait_started_timestamp
        FROM bathroom_data_primary b
        WHERE ST_Intersects(
            b.location::geometry,
            ST_MakeEnvelope(
                p_min_longitude,
                p_min_latitude,
                p_max_longitude,
                p_max_latitude,
                4326
            )
        )
    ),
    client_rows AS (
        SELECT
            (entry->>'id')::bigint AS id,
            (entry->>'version')::bigint AS version
        FROM jsonb_array_elements(p_client_cache) AS entry
        WHERE entry ? 'id' AND entry ? 'version'
    ),
    upserts AS (
        SELECT
            r.id,
            r.latitude,
            r.longitude,
            r.existence_value,
            r.deletion_wait_started_timestamp,
            r.version
        FROM remote_rows r
        LEFT JOIN client_rows c ON c.id = r.id
        WHERE c.id IS NULL OR c.version < r.version
    ),
    delete_ids AS (
        SELECT c.id
        FROM client_rows c
        LEFT JOIN remote_rows r ON r.id = c.id
        WHERE r.id IS NULL
    )
    SELECT jsonb_build_object(
        'upserts',
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', u.id,
                        'latitude', u.latitude,
                        'longitude', u.longitude,
                        'existence_value', u.existence_value,
                        'deletion_wait_started_timestamp', u.deletion_wait_started_timestamp,
                        'version', u.version
                    )
                )
                FROM upserts u
            ),
            '[]'::jsonb
        ),
        'delete_ids',
        COALESCE(
            (
                SELECT jsonb_agg(d.id)
                FROM delete_ids d
            ),
            '[]'::jsonb
        )
    )
    INTO v_result;

    RETURN v_result;
END;
$$;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 20)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
