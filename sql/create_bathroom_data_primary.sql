-- Run this in the Supabase SQL editor (or psql) to create bathroom_data_primary.
-- Requires a Postgres database with PostGIS available (e.g. Supabase).

-- 1. PostGIS extension for geography columns and spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Custom enum type (spec: Verify_Status)
DO $$ BEGIN
    CREATE TYPE verify_status AS ENUM ('pending', 'verified');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create the table
CREATE TABLE bathroom_data_primary (
    id SERIAL PRIMARY KEY,

    -- WGS 84 point; used for rectangular viewport bounding-box queries
    location GEOGRAPHY(Point, 4326) NOT NULL,

    verify_status verify_status NOT NULL DEFAULT 'pending',

    -- Exactly 64 characters
    temp_data TEXT NOT NULL CHECK (char_length(temp_data) = 64),

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. GIST index for efficient rectangular area queries, e.g.:
--    SELECT *
--    FROM bathroom_data_primary
--    WHERE ST_Intersects(
--        location,
--        ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)::geography
--    );
CREATE INDEX bathroom_data_primary_location_gix
    ON bathroom_data_primary
    USING GIST (location);

-- 5. Prevent created_at from being updated after insert
CREATE OR REPLACE FUNCTION protect_created_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'The created_at column cannot be updated.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_immutable_created_at_bathroom_data_primary
    BEFORE UPDATE ON bathroom_data_primary
    FOR EACH ROW
    EXECUTE FUNCTION protect_created_at();
