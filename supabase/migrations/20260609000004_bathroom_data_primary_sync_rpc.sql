-- Viewport sync RPC for bathroom_data_primary (version-aware read with client cache diff).

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
            b.verify_status
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
            r.verify_status,
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
                        'verify_status', u.verify_status,
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

GRANT EXECUTE ON FUNCTION sync_bathroom_data_primary_in_bbox(
    double precision,
    double precision,
    double precision,
    double precision,
    jsonb
) TO anon, authenticated, service_role;
