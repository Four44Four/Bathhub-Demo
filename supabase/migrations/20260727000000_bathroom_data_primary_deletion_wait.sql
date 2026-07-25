-- Pending-deletion vote handling and daily purge of expired bathrooms.
-- Server schema version 19.

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

CREATE OR REPLACE FUNCTION delete_expired_pending_deletion_bathrooms()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_count integer;
BEGIN
    DELETE FROM bathroom_data_primary
    WHERE deletion_wait_started_timestamp IS NOT NULL
        AND deletion_wait_started_timestamp < CURRENT_TIMESTAMP - INTERVAL '180 days';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_expired_pending_deletion_bathrooms()
    TO anon, authenticated, service_role;

DO $$
BEGIN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'delete_expired_pending_deletion_bathrooms_daily';

    PERFORM cron.schedule(
        'delete_expired_pending_deletion_bathrooms_daily',
        '0 0 * * *',
        $cmd$SELECT public.delete_expired_pending_deletion_bathrooms();$cmd$
    );
END $$;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 19)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
