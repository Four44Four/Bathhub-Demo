BEGIN;

CREATE OR REPLACE FUNCTION update_bathroom_data_primary_verify_status(
    p_id bigint,
    p_verify_status verify_status
)
RETURNS TABLE (
    id bigint,
    latitude double precision,
    longitude double precision,
    verify_status verify_status,
    temp_data text,
    created_at timestamp,
    version bigint
)
LANGUAGE sql
AS $$
    UPDATE bathroom_data_primary b
    SET
        verify_status = p_verify_status,
        version = b.version + 1
    WHERE b.id = p_id
    RETURNING
        b.id,
        ST_Y(b.location::geometry) AS latitude,
        ST_X(b.location::geometry) AS longitude,
        b.verify_status,
        b.temp_data,
        b.created_at,
        b.version;
$$;

GRANT EXECUTE ON FUNCTION update_bathroom_data_primary_verify_status(
    bigint,
    verify_status
) TO anon, authenticated, service_role;

COMMIT;
