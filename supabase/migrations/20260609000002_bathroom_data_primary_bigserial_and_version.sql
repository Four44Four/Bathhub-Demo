-- Promote bathroom_data_primary.id to BIGSERIAL semantics and add version column.
-- Migration version 20260609000002 runs after 00001 RPC helpers and before 00003/00004.

ALTER TABLE bathroom_data_primary
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE bathroom_data_primary
    ALTER COLUMN id TYPE BIGINT;

ALTER SEQUENCE bathroom_data_primary_id_seq AS BIGINT;

DROP FUNCTION IF EXISTS create_bathroom_data_primary_at(
    double precision,
    double precision,
    text
);

CREATE OR REPLACE FUNCTION create_bathroom_data_primary_at(
    p_latitude double precision,
    p_longitude double precision,
    p_temp_data text
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
    INSERT INTO bathroom_data_primary (location, verify_status, temp_data, version)
    VALUES (
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        'pending',
        p_temp_data,
        0
    )
    RETURNING
        bathroom_data_primary.id,
        ST_Y(bathroom_data_primary.location::geometry) AS latitude,
        ST_X(bathroom_data_primary.location::geometry) AS longitude,
        bathroom_data_primary.verify_status,
        bathroom_data_primary.temp_data,
        bathroom_data_primary.created_at,
        bathroom_data_primary.version;
$$;

DROP FUNCTION IF EXISTS get_bathroom_data_primary_in_bbox(
    double precision,
    double precision,
    double precision,
    double precision
);

CREATE OR REPLACE FUNCTION get_bathroom_data_primary_in_bbox(
    p_min_longitude double precision,
    p_min_latitude double precision,
    p_max_longitude double precision,
    p_max_latitude double precision
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
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
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
        b.created_at,
        b.version
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
