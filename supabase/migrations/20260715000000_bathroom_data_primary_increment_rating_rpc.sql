-- RPC to increment one per-star rating count column on bathroom_data_primary.
-- Server schema version 12.

BEGIN;

CREATE OR REPLACE FUNCTION increment_bathroom_data_primary_rating_count(
    p_id bigint,
    p_stars integer
)
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
        b.verify_status,
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

GRANT EXECUTE ON FUNCTION increment_bathroom_data_primary_rating_count(
    bigint,
    integer
) TO anon, authenticated, service_role;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 12)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
