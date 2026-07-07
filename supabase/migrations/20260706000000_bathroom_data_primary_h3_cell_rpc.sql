BEGIN;

DROP FUNCTION IF EXISTS get_bathroom_data_primary_in_h3_cell_polygons(jsonb);

CREATE FUNCTION get_bathroom_data_primary_in_h3_cell_polygons(
    p_cells jsonb
)
RETURNS TABLE (
    cell text,
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
        b.verify_status,
        b.temp_data,
        b.created_at,
        b.version
    FROM cell_polygons
    JOIN bathroom_data_primary b
        ON ST_Intersects(b.location::geometry, cell_polygons.geom);
END;
$$;

GRANT EXECUTE ON FUNCTION get_bathroom_data_primary_in_h3_cell_polygons(
    jsonb
) TO anon, authenticated, service_role;

COMMIT;
