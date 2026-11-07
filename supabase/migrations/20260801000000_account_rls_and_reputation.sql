-- Account profiles, reputation, and defensive RLS for existing and future public tables.
-- Server schema version 24.
--
-- Anonymous roles may read bathroom rows. Creating, deleting, rating, and voting
-- require an account. Voting and rating also require reputation >= -20 and apply
-- the reputation window and existence-vote weight from the accounts specification.
-- New tables in public start with row level security forced on and no grants, so
-- they stay inaccessible until an explicit policy is added.

BEGIN;

CREATE TABLE IF NOT EXISTS public.accounts (
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    username text NOT NULL,
    reputation_score integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT accounts_username_unique UNIQUE (username)
);

ALTER TABLE public.accounts
    DROP CONSTRAINT IF EXISTS accounts_username_format;
ALTER TABLE public.accounts
    ADD CONSTRAINT accounts_username_format
    CHECK (username ~ '^[a-z0-9_]{3,32}$');

CREATE TABLE IF NOT EXISTS public.account_bathroom_actions (
    id bigserial PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
    acted_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_bathroom_actions_account_acted_at_idx
    ON public.account_bathroom_actions (account_id, acted_at);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_username text;
BEGIN
    v_username := lower(btrim(coalesce(NEW.raw_user_meta_data ->> 'username', '')));
    IF v_username !~ '^[a-z0-9_]{3,32}$' THEN
        v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 26);
    END IF;

    INSERT INTO public.accounts (id, username, reputation_score)
    VALUES (NEW.id, v_username, 0)
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.request_is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
    SELECT COALESCE(auth.role(), '') = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.bathroom_existence_vote_weight(p_reputation integer)
RETURNS real
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT (1::numeric + floor(p_reputation::numeric / 10) * 0.01)::real;
$$;

CREATE OR REPLACE FUNCTION public.assert_account_can_mutate()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
    IF public.request_is_service_role() THEN
        RETURN;
    END IF;

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'account required';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.accounts
        WHERE id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'account required';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_can_vote_or_rate()
RETURNS TABLE (
    account_id uuid,
    reputation_score integer,
    vote_weight real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
    v_account uuid;
    v_reputation integer;
BEGIN
    IF public.request_is_service_role() THEN
        account_id := NULL;
        reputation_score := 0;
        vote_weight := 1.0;
        RETURN NEXT;
        RETURN;
    END IF;

    v_account := auth.uid();
    IF v_account IS NULL THEN
        RAISE EXCEPTION 'account required';
    END IF;

    SELECT accounts.reputation_score
    INTO v_reputation
    FROM public.accounts
    WHERE accounts.id = v_account;

    IF v_reputation IS NULL THEN
        RAISE EXCEPTION 'account required';
    END IF;

    IF v_reputation < -20 THEN
        RAISE EXCEPTION 'reputation too low to vote or rate';
    END IF;

    account_id := v_account;
    reputation_score := v_reputation;
    vote_weight := public.bathroom_existence_vote_weight(v_reputation);
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_account_bathroom_action_reputation(p_account_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_recent integer;
    v_delta integer;
    v_score integer;
BEGIN
    DELETE FROM public.account_bathroom_actions
    WHERE account_id = p_account_id
        AND acted_at < now() - interval '2 minutes';

    INSERT INTO public.account_bathroom_actions (account_id, acted_at)
    VALUES (p_account_id, now());

    SELECT COUNT(*)::integer
    INTO v_recent
    FROM public.account_bathroom_actions
    WHERE account_id = p_account_id
        AND acted_at >= now() - interval '2 minutes';

    IF v_recent <= 5 THEN
        v_delta := 1;
    ELSIF v_recent <= 10 THEN
        v_delta := 0;
    ELSE
        v_delta := -1;
    END IF;

    UPDATE public.accounts
    SET reputation_score = reputation_score + v_delta
    WHERE id = p_account_id
    RETURNING accounts.reputation_score INTO v_score;

    RETURN v_score;
END;
$$;

CREATE OR REPLACE FUNCTION public.drift_account_reputation_toward_zero()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_updated_count integer;
BEGIN
    UPDATE public.accounts
    SET reputation_score = CASE
        WHEN reputation_score > 0 THEN reputation_score - 1
        WHEN reputation_score < 0 THEN reputation_score + 1
        ELSE 0
    END
    WHERE reputation_score <> 0;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_own_account()
RETURNS TABLE (
    id uuid,
    username text,
    reputation_score integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, auth, pg_catalog
AS $$
    SELECT accounts.id, accounts.username, accounts.reputation_score
    FROM public.accounts
    WHERE accounts.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO supabase_auth_admin;
REVOKE ALL ON FUNCTION public.request_is_service_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bathroom_existence_vote_weight(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_account_can_mutate() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_can_vote_or_rate() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_account_bathroom_action_reputation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.drift_account_reputation_toward_zero() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.drift_account_reputation_toward_zero() TO service_role;
REVOKE ALL ON FUNCTION public.get_own_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_account() TO authenticated, service_role;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.account_bathroom_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_bathroom_actions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bathroom_data_primary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bathroom_data_primary FORCE ROW LEVEL SECURITY;
ALTER TABLE public.server_db_schema_version ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounts_select_own ON public.accounts;
CREATE POLICY accounts_select_own
    ON public.accounts
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS accounts_service_role_all ON public.accounts;
CREATE POLICY accounts_service_role_all
    ON public.accounts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS account_bathroom_actions_service_role_all
    ON public.account_bathroom_actions;
CREATE POLICY account_bathroom_actions_service_role_all
    ON public.account_bathroom_actions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS bathroom_data_primary_select_public ON public.bathroom_data_primary;
CREATE POLICY bathroom_data_primary_select_public
    ON public.bathroom_data_primary
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS bathroom_data_primary_delete_account ON public.bathroom_data_primary;
CREATE POLICY bathroom_data_primary_delete_account
    ON public.bathroom_data_primary
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.accounts
            WHERE accounts.id = auth.uid()
        )
    );

REVOKE INSERT, UPDATE, DELETE ON TABLE public.bathroom_data_primary FROM anon;
REVOKE INSERT, UPDATE ON TABLE public.bathroom_data_primary FROM authenticated;
GRANT SELECT ON TABLE public.bathroom_data_primary TO anon, authenticated;
GRANT DELETE ON TABLE public.bathroom_data_primary TO authenticated;

REVOKE ALL ON TABLE public.accounts FROM anon, authenticated;
GRANT SELECT ON TABLE public.accounts TO authenticated;
GRANT ALL ON TABLE public.accounts TO service_role;

REVOKE ALL ON TABLE public.account_bathroom_actions FROM anon, authenticated;
GRANT ALL ON TABLE public.account_bathroom_actions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.account_bathroom_actions_id_seq TO service_role;
REVOKE ALL ON TABLE public.server_db_schema_version FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.enable_rls_on_future_public_tables()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
    command record;
BEGIN
    FOR command IN
        SELECT object_identity
        FROM pg_event_trigger_ddl_commands()
        WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
            AND schema_name = 'public'
    LOOP
        EXECUTE format(
            'ALTER TABLE %s ENABLE ROW LEVEL SECURITY',
            command.object_identity
        );
        EXECUTE format(
            'ALTER TABLE %s FORCE ROW LEVEL SECURITY',
            command.object_identity
        );
        EXECUTE format(
            'REVOKE ALL ON TABLE %s FROM anon, authenticated',
            command.object_identity
        );
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.enable_rls_on_future_public_tables()
    FROM PUBLIC, anon, authenticated;

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
BEGIN
    PERFORM public.assert_account_can_mutate();

    RETURN QUERY
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
END;
$$;

DROP FUNCTION IF EXISTS increment_bathroom_data_primary_rating_count(bigint, integer);

CREATE OR REPLACE FUNCTION increment_bathroom_data_primary_rating_count(
    p_id bigint,
    p_stars integer
)
RETURNS TABLE (
    id bigint,
    latitude double precision,
    longitude double precision,
    existence_value real,
    deletion_wait_started_timestamp timestamp,
    temp_data text,
    created_at timestamp,
    version bigint,
    rating_1_count bigint,
    rating_2_count bigint,
    rating_3_count bigint,
    rating_4_count bigint,
    rating_5_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_account_id uuid;
    v_weight real;
    v_row record;
    v_did_update boolean := false;
BEGIN
    IF p_id IS NULL OR p_id <= 0 THEN
        RAISE EXCEPTION 'invalid bathroom id';
    END IF;

    IF p_stars IS NULL OR p_stars < 1 OR p_stars > 5 THEN
        RAISE EXCEPTION 'invalid rating stars';
    END IF;

    SELECT checked.account_id, checked.vote_weight
    INTO v_account_id, v_weight
    FROM public.assert_can_vote_or_rate() AS checked;

    FOR v_row IN
        UPDATE bathroom_data_primary b
        SET
            rating_1_count = CASE
                WHEN p_stars = 1 THEN b.rating_1_count + 1
                ELSE b.rating_1_count
            END,
            rating_2_count = CASE
                WHEN p_stars = 2 THEN b.rating_2_count + 1
                ELSE b.rating_2_count
            END,
            rating_3_count = CASE
                WHEN p_stars = 3 THEN b.rating_3_count + 1
                ELSE b.rating_3_count
            END,
            rating_4_count = CASE
                WHEN p_stars = 4 THEN b.rating_4_count + 1
                ELSE b.rating_4_count
            END,
            rating_5_count = CASE
                WHEN p_stars = 5 THEN b.rating_5_count + 1
                ELSE b.rating_5_count
            END,
            version = b.version + 1
        WHERE b.id = p_id
        RETURNING
            b.id,
            ST_Y(b.location::geometry) AS latitude,
            ST_X(b.location::geometry) AS longitude,
            b.existence_value,
            b.deletion_wait_started_timestamp,
            b.temp_data,
            b.created_at,
            b.version,
            b.rating_1_count,
            b.rating_2_count,
            b.rating_3_count,
            b.rating_4_count,
            b.rating_5_count
    LOOP
        v_did_update := true;
        RETURN QUERY
        SELECT
            v_row.id,
            v_row.latitude,
            v_row.longitude,
            v_row.existence_value,
            v_row.deletion_wait_started_timestamp,
            v_row.temp_data,
            v_row.created_at,
            v_row.version,
            v_row.rating_1_count,
            v_row.rating_2_count,
            v_row.rating_3_count,
            v_row.rating_4_count,
            v_row.rating_5_count;
    END LOOP;

    IF v_did_update AND v_account_id IS NOT NULL THEN
        PERFORM public.apply_account_bathroom_action_reputation(v_account_id);
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS increment_bathroom_data_primary_existence_vote_count(
    bigint,
    boolean
);

CREATE OR REPLACE FUNCTION increment_bathroom_data_primary_existence_vote_count(
    p_id bigint,
    p_vote_for_exists boolean
)
RETURNS TABLE (
    id bigint,
    latitude double precision,
    longitude double precision,
    existence_value real,
    deletion_wait_started_timestamp timestamp,
    temp_data text,
    created_at timestamp,
    version bigint,
    rating_1_count bigint,
    rating_2_count bigint,
    rating_3_count bigint,
    rating_4_count bigint,
    rating_5_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_account_id uuid;
    v_weight real;
    v_pending boolean;
    v_row record;
    v_did_update boolean := false;
BEGIN
    IF p_id IS NULL OR p_id <= 0 THEN
        RAISE EXCEPTION 'invalid bathroom id';
    END IF;

    IF p_vote_for_exists IS NULL THEN
        RAISE EXCEPTION 'invalid existence vote';
    END IF;

    SELECT checked.account_id, checked.vote_weight
    INTO v_account_id, v_weight
    FROM public.assert_can_vote_or_rate() AS checked;

    SELECT b.deletion_wait_started_timestamp IS NOT NULL
    INTO v_pending
    FROM bathroom_data_primary b
    WHERE b.id = p_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF NOT p_vote_for_exists AND v_pending THEN
        RETURN QUERY
        SELECT
            b.id,
            ST_Y(b.location::geometry) AS latitude,
            ST_X(b.location::geometry) AS longitude,
            b.existence_value,
            b.deletion_wait_started_timestamp,
            b.temp_data,
            b.created_at,
            b.version,
            b.rating_1_count,
            b.rating_2_count,
            b.rating_3_count,
            b.rating_4_count,
            b.rating_5_count
        FROM bathroom_data_primary b
        WHERE b.id = p_id;
        RETURN;
    END IF;

    FOR v_row IN
        UPDATE bathroom_data_primary b
        SET
            existence_value = CASE
                WHEN p_vote_for_exists THEN b.existence_value + v_weight
                ELSE b.existence_value - v_weight
            END,
            deletion_wait_started_timestamp = CASE
                WHEN p_vote_for_exists AND b.deletion_wait_started_timestamp IS NOT NULL THEN
                    NULL
                WHEN NOT p_vote_for_exists
                    AND b.deletion_wait_started_timestamp IS NULL
                    AND (b.existence_value - v_weight) <= -10.0 THEN
                    CURRENT_TIMESTAMP
                ELSE
                    b.deletion_wait_started_timestamp
            END,
            version = b.version + 1
        WHERE b.id = p_id
        RETURNING
            b.id,
            ST_Y(b.location::geometry) AS latitude,
            ST_X(b.location::geometry) AS longitude,
            b.existence_value,
            b.deletion_wait_started_timestamp,
            b.temp_data,
            b.created_at,
            b.version,
            b.rating_1_count,
            b.rating_2_count,
            b.rating_3_count,
            b.rating_4_count,
            b.rating_5_count
    LOOP
        v_did_update := true;
        RETURN QUERY
        SELECT
            v_row.id,
            v_row.latitude,
            v_row.longitude,
            v_row.existence_value,
            v_row.deletion_wait_started_timestamp,
            v_row.temp_data,
            v_row.created_at,
            v_row.version,
            v_row.rating_1_count,
            v_row.rating_2_count,
            v_row.rating_3_count,
            v_row.rating_4_count,
            v_row.rating_5_count;
    END LOOP;

    IF v_did_update AND v_account_id IS NOT NULL THEN
        PERFORM public.apply_account_bathroom_action_reputation(v_account_id);
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION create_bathroom_data_primary_at(
    double precision,
    double precision,
    text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_bathroom_data_primary_at(
    double precision,
    double precision,
    text
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION increment_bathroom_data_primary_rating_count(bigint, integer)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_bathroom_data_primary_rating_count(bigint, integer)
    TO authenticated, service_role;

REVOKE ALL ON FUNCTION increment_bathroom_data_primary_existence_vote_count(bigint, boolean)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_bathroom_data_primary_existence_vote_count(bigint, boolean)
    TO authenticated, service_role;

REVOKE ALL ON FUNCTION decay_bathroom_data_primary_existence_value()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION decay_bathroom_data_primary_existence_value()
    TO service_role;

REVOKE ALL ON FUNCTION delete_expired_pending_deletion_bathrooms()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_expired_pending_deletion_bathrooms()
    TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        EXECUTE 'CREATE EXTENSION pg_cron WITH SCHEMA pg_catalog';
        GRANT USAGE ON SCHEMA cron TO postgres;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
    END IF;
END $$;

DO $$
BEGIN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'drift_account_reputation_weekly';

    PERFORM cron.schedule(
        'drift_account_reputation_weekly',
        '0 0 * * 0',
        $cmd$SELECT public.drift_account_reputation_toward_zero();$cmd$
    );
END $$;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 24)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;

-- Event triggers cannot be created inside a transaction block.
DROP EVENT TRIGGER IF EXISTS enable_rls_on_future_public_tables;
CREATE EVENT TRIGGER enable_rls_on_future_public_tables
    ON ddl_command_end
    WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
    EXECUTE FUNCTION public.enable_rls_on_future_public_tables();
