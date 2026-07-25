-- RPC to increment existence vote counts on bathroom_data_primary.
-- Server schema version 15.

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
    exists_vote_count bigint,
    not_exists_vote_count bigint,
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
    UPDATE bathroom_data_primary b
    SET
        exists_vote_count = CASE
            WHEN p_vote_for_exists THEN b.exists_vote_count + 1
            ELSE b.exists_vote_count
        END,
        not_exists_vote_count = CASE
            WHEN p_vote_for_exists THEN b.not_exists_vote_count
            ELSE b.not_exists_vote_count + 1
        END,
        version = b.version + 1
    WHERE b.id = p_id
    RETURNING
        b.id,
        ST_Y(b.location::geometry) AS latitude,
        ST_X(b.location::geometry) AS longitude,
        b.exists_vote_count,
        b.not_exists_vote_count,
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

GRANT EXECUTE ON FUNCTION increment_bathroom_data_primary_existence_vote_count(
    bigint,
    boolean
) TO anon, authenticated, service_role;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 15)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
