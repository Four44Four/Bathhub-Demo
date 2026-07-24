-- Extend nearest-bathroom lookup with minimum average rating constraint.
-- Server schema version 13.

DROP FUNCTION IF EXISTS get_nearest_bathroom_data_primary(
    double precision,
    double precision,
    double precision
);

CREATE OR REPLACE FUNCTION get_nearest_bathroom_data_primary(
    p_latitude double precision,
    p_longitude double precision,
    p_max_distance_m double precision,
    p_min_rating double precision
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
        OR p_max_distance_m <> p_max_distance_m
        OR p_min_rating <> p_min_rating THEN
        RAISE EXCEPTION 'invalid nearest-bathroom query coordinates';
    END IF;

    IF p_max_distance_m < 0 THEN
        RAISE EXCEPTION 'invalid nearest-bathroom max distance';
    END IF;

    IF p_min_rating < 0 OR p_min_rating > 5 THEN
        RAISE EXCEPTION 'invalid nearest-bathroom min rating';
    END IF;

    v_origin := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;

    RETURN QUERY
    SELECT
        b.id,
        ST_Y(b.location::geometry) AS latitude,
        ST_X(b.location::geometry) AS longitude
    FROM bathroom_data_primary b
    WHERE ST_DWithin(b.location, v_origin, p_max_distance_m)
      AND (
        CASE
          WHEN (
            b.rating_1_count
            + b.rating_2_count
            + b.rating_3_count
            + b.rating_4_count
            + b.rating_5_count
          ) = 0 THEN 0::double precision
          ELSE (
            b.rating_1_count * 1.0
            + b.rating_2_count * 2.0
            + b.rating_3_count * 3.0
            + b.rating_4_count * 4.0
            + b.rating_5_count * 5.0
          ) / (
            b.rating_1_count
            + b.rating_2_count
            + b.rating_3_count
            + b.rating_4_count
            + b.rating_5_count
          )
        END
      ) >= p_min_rating
    ORDER BY b.location <-> v_origin
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_nearest_bathroom_data_primary(
    double precision,
    double precision,
    double precision,
    double precision
) TO anon, authenticated, service_role;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 13)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;
