-- Daily decay of bathroom_data_primary.existence_value (multiply by 0.995 at 00:00 UTC).
-- Server schema version 17.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        EXECUTE 'CREATE EXTENSION pg_cron WITH SCHEMA pg_catalog';
        GRANT USAGE ON SCHEMA cron TO postgres;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION decay_bathroom_data_primary_existence_value()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated_count integer;
BEGIN
    UPDATE bathroom_data_primary
    SET existence_value = existence_value * 0.995
    WHERE TRUE;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION decay_bathroom_data_primary_existence_value()
    TO anon, authenticated, service_role;

DO $$
BEGIN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'decay_bathroom_existence_value_daily';

    PERFORM cron.schedule(
        'decay_bathroom_existence_value_daily',
        '0 0 * * *',
        $cmd$SELECT public.decay_bathroom_data_primary_existence_value();$cmd$
    );
END $$;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 17)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
