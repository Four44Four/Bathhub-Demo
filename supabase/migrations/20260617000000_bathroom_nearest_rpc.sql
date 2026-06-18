-- Nearest-bathroom lookup for find-nearest-bathroom flow (PostGIS KNN + max distance).

CREATE OR REPLACE FUNCTION get_nearest_bathroom_data_primary(
    p_latitude double precision,
    p_longitude double precision,
    p_max_distance_m double precision
)
RETURNS TABLE (
    id bigint,
    latitude double precision,
    longitude double precision
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_origin geography;
BEGIN
    IF p_latitude <> p_latitude
        OR p_longitude <> p_longitude
        OR p_max_distance_m <> p_max_distance_m THEN
        RAISE EXCEPTION 'invalid nearest-bathroom query coordinates';
    END IF;

    IF p_max_distance_m < 0 THEN
        RAISE EXCEPTION 'invalid nearest-bathroom max distance';
    END IF;

    v_origin := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;

    RETURN QUERY
    SELECT
        b.id,
        ST_Y(b.location::geometry) AS latitude,
        ST_X(b.location::geometry) AS longitude
    FROM bathroom_data_primary b
    WHERE ST_DWithin(b.location, v_origin, p_max_distance_m)
    ORDER BY b.location <-> v_origin
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_nearest_bathroom_data_primary(
    double precision,
    double precision,
    double precision
) TO anon, authenticated, service_role;
