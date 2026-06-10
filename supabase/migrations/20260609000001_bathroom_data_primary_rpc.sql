-- PostGIS RPC helpers for bathroom_data_primary CRUD.
-- Run after create_bathroom_data_primary.sql in the Supabase SQL editor (or psql).

CREATE OR REPLACE FUNCTION create_bathroom_data_primary_at(
    p_latitude double precision,
    p_longitude double precision,
    p_temp_data text
)
RETURNS TABLE (
    id integer,
    latitude double precision,
    longitude double precision,
    verify_status verify_status,
    temp_data text,
    created_at timestamp
)
LANGUAGE sql
AS $$
    INSERT INTO bathroom_data_primary (location, verify_status, temp_data)
    VALUES (
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        'pending',
        p_temp_data
    )
    RETURNING
        bathroom_data_primary.id,
        ST_Y(bathroom_data_primary.location::geometry) AS latitude,
        ST_X(bathroom_data_primary.location::geometry) AS longitude,
        bathroom_data_primary.verify_status,
        bathroom_data_primary.temp_data,
        bathroom_data_primary.created_at;
$$;

CREATE OR REPLACE FUNCTION get_bathroom_data_primary_in_bbox(
    p_min_longitude double precision,
    p_min_latitude double precision,
    p_max_longitude double precision,
    p_max_latitude double precision
)
RETURNS TABLE (
    id integer,
    latitude double precision,
    longitude double precision,
    verify_status verify_status,
    temp_data text,
    created_at timestamp
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- NaN fails the equality self-check; reject before building an envelope.
    IF p_min_longitude <> p_min_longitude
        OR p_min_latitude <> p_min_latitude
        OR p_max_longitude <> p_max_longitude
        OR p_max_latitude <> p_max_latitude THEN
        RAISE EXCEPTION 'invalid bbox coordinates';
    END IF;

    RETURN QUERY
    SELECT
        b.id,
        ST_Y(b.location::geometry) AS latitude,
        ST_X(b.location::geometry) AS longitude,
        b.verify_status,
        b.temp_data,
        b.created_at
    FROM bathroom_data_primary b
  -- Geometry envelopes support full-world longitude spans; geography casts
  -- reject envelopes with antipodal (>= 180 degree) edges.
    WHERE ST_Intersects(
        b.location::geometry,
        ST_MakeEnvelope(
            p_min_longitude,
            p_min_latitude,
            p_max_longitude,
            p_max_latitude,
            4326
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION create_bathroom_data_primary_at(
    double precision,
    double precision,
    text
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION get_bathroom_data_primary_in_bbox(
    double precision,
    double precision,
    double precision,
    double precision
) TO anon, authenticated, service_role;
