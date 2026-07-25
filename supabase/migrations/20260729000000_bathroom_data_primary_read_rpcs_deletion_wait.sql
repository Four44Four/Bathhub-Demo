-- Expose deletion_wait_started_timestamp on remaining bathroom read/create RPCs.
-- Server schema version 21.

BEGIN;

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
    existence_value real,
    deletion_wait_started_timestamp timestamp,
    temp_data text,
    created_at timestamp,
    version bigint
)
LANGUAGE sql
AS $$
    INSERT INTO bathroom_data_primary (
        location,
        temp_data,
        version,
        existence_value
    )
    VALUES (
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        p_temp_data,
        0,
        0.0
    )
    RETURNING
        bathroom_data_primary.id,
        ST_Y(bathroom_data_primary.location::geometry) AS latitude,
        ST_X(bathroom_data_primary.location::geometry) AS longitude,
        bathroom_data_primary.existence_value,
        bathroom_data_primary.deletion_wait_started_timestamp,
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
    existence_value real,
    deletion_wait_started_timestamp timestamp,
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
        b.existence_value,
        b.deletion_wait_started_timestamp,
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

DROP FUNCTION IF EXISTS get_bathroom_data_primary_in_h3_cell_polygons(jsonb);

CREATE FUNCTION get_bathroom_data_primary_in_h3_cell_polygons(
    p_cells jsonb
)
RETURNS TABLE (
    cell text,
    id bigint,
    latitude double precision,
    longitude double precision,
    existence_value real,
    deletion_wait_started_timestamp timestamp,
    temp_data text,
    created_at timestamp,
    version bigint
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF p_cells IS NULL OR jsonb_typeof(p_cells) <> 'array' THEN
        RAISE EXCEPTION 'invalid h3 cell polygon payload';
    END IF;

    RETURN QUERY
    WITH cell_polygons AS (
        SELECT
            input_cells.cell,
            ST_SetSRID(
                ST_GeomFromGeoJSON(input_cells.polygon::text),
                4326
            ) AS geom
        FROM jsonb_to_recordset(p_cells) AS input_cells(
            cell text,
            polygon jsonb
        )
        WHERE input_cells.cell IS NOT NULL
            AND input_cells.polygon IS NOT NULL
    )
    SELECT
        cell_polygons.cell,
        b.id,
        ST_Y(b.location::geometry) AS latitude,
        ST_X(b.location::geometry) AS longitude,
        b.existence_value,
        b.deletion_wait_started_timestamp,
        b.temp_data,
        b.created_at,
        b.version
    FROM cell_polygons
    JOIN bathroom_data_primary b
        ON ST_Intersects(b.location::geometry, cell_polygons.geom);
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

GRANT EXECUTE ON FUNCTION get_bathroom_data_primary_in_h3_cell_polygons(jsonb)
    TO anon, authenticated, service_role;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 21)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
