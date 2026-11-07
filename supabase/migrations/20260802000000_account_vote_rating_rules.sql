-- One vote and one rating per account per bathroom, unique-bathroom reputation,
-- negative vote-weight drag, and no direct bathroom deletes.
-- Server schema version 25.
--
-- The 20-per-minute bathroom update cap matches
-- SERVER_RATE_LIMITS.bathroomUpdate.perMinute. It is enforced here so a
-- signed-in token cannot skip the app server's Redis limit.

BEGIN;

ALTER TABLE public.account_bathroom_actions
    ADD COLUMN IF NOT EXISTS bathroom_id bigint;

DELETE FROM public.account_bathroom_actions
WHERE bathroom_id IS NULL;

ALTER TABLE public.account_bathroom_actions
    ALTER COLUMN bathroom_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS account_bathroom_actions_account_bathroom_uidx
    ON public.account_bathroom_actions (account_id, bathroom_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'account_bathroom_actions_bathroom_id_fkey'
    ) THEN
        ALTER TABLE public.account_bathroom_actions
            ADD CONSTRAINT account_bathroom_actions_bathroom_id_fkey
            FOREIGN KEY (bathroom_id)
            REFERENCES public.bathroom_data_primary (id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.account_bathroom_existence_votes (
    account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
    bathroom_id bigint NOT NULL REFERENCES public.bathroom_data_primary (id) ON DELETE CASCADE,
    vote_for_exists boolean NOT NULL,
    applied_weight real NOT NULL,
    voted_at timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, bathroom_id)
);

CREATE INDEX IF NOT EXISTS account_bathroom_existence_votes_bathroom_idx
    ON public.account_bathroom_existence_votes (bathroom_id);

CREATE TABLE IF NOT EXISTS public.account_bathroom_ratings (
    account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
    bathroom_id bigint NOT NULL REFERENCES public.bathroom_data_primary (id) ON DELETE CASCADE,
    stars integer NOT NULL,
    rated_at timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, bathroom_id),
    CONSTRAINT account_bathroom_ratings_stars_range CHECK (stars BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS account_bathroom_ratings_bathroom_idx
    ON public.account_bathroom_ratings (bathroom_id);

CREATE TABLE IF NOT EXISTS public.account_bathroom_update_events (
    id bigserial PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
    acted_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_bathroom_update_events_account_acted_at_idx
    ON public.account_bathroom_update_events (account_id, acted_at);

CREATE OR REPLACE FUNCTION public.bathroom_existence_vote_weight(p_reputation integer)
RETURNS real
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_reputation >= 0 THEN
            (1::numeric + floor(p_reputation::numeric / 10) * 0.01)::real
        ELSE
            (1::numeric - floor((-p_reputation)::numeric / 5) * 0.10)::real
    END;
$$;

CREATE OR REPLACE FUNCTION public.lock_account_row(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF p_account_id IS NULL THEN
        RETURN;
    END IF;

    PERFORM 1
    FROM public.accounts
    WHERE id = p_account_id
    FOR UPDATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_account_bathroom_update_rate_limit(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_recent integer;
BEGIN
    IF p_account_id IS NULL OR public.request_is_service_role() THEN
        RETURN;
    END IF;

    DELETE FROM public.account_bathroom_update_events
    WHERE account_id = p_account_id
        AND acted_at < now() - interval '1 minute';

    SELECT COUNT(*)::integer
    INTO v_recent
    FROM public.account_bathroom_update_events
    WHERE account_id = p_account_id
        AND acted_at >= now() - interval '1 minute';

    IF v_recent >= 20 THEN
        RAISE EXCEPTION 'Rate limit exceeded: bathroom updates is limited to 20 requests per minute.';
    END IF;

    INSERT INTO public.account_bathroom_update_events (account_id)
    VALUES (p_account_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_account_bathroom_action_reputation(
    p_account_id uuid,
    p_bathroom_id bigint
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_recent integer;
    v_delta integer;
    v_score integer;
    v_already boolean;
BEGIN
    PERFORM public.lock_account_row(p_account_id);

    DELETE FROM public.account_bathroom_actions
    WHERE account_id = p_account_id
        AND acted_at < now() - interval '2 minutes';

    SELECT EXISTS (
        SELECT 1
        FROM public.account_bathroom_actions
        WHERE account_id = p_account_id
            AND bathroom_id = p_bathroom_id
    )
    INTO v_already;

    IF v_already THEN
        UPDATE public.account_bathroom_actions
        SET acted_at = now()
        WHERE account_id = p_account_id
            AND bathroom_id = p_bathroom_id;

        SELECT accounts.reputation_score
        INTO v_score
        FROM public.accounts
        WHERE accounts.id = p_account_id;

        RETURN v_score;
    END IF;

    INSERT INTO public.account_bathroom_actions (account_id, bathroom_id, acted_at)
    VALUES (p_account_id, p_bathroom_id, now());

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

CREATE OR REPLACE FUNCTION public.bathroom_data_primary_full_row(p_id bigint)
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
    SELECT
        b.id,
        ST_Y(b.location::geometry),
        ST_X(b.location::geometry),
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
    FROM public.bathroom_data_primary AS b
    WHERE b.id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.return_bathroom_data_primary_full_row(p_id bigint)
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
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT
        full_row.id,
        full_row.latitude,
        full_row.longitude,
        full_row.existence_value,
        full_row.deletion_wait_started_timestamp,
        full_row.temp_data,
        full_row.created_at,
        full_row.version,
        full_row.rating_1_count,
        full_row.rating_2_count,
        full_row.rating_3_count,
        full_row.rating_4_count,
        full_row.rating_5_count
    FROM public.bathroom_data_primary_full_row(p_id) AS full_row;
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
    v_reputation integer;
    v_previous_stars integer;
    v_has_rating boolean := false;
    v_exists boolean;
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

    IF v_account_id IS NULL THEN
        UPDATE bathroom_data_primary AS b
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
        WHERE b.id = p_id;

        RETURN QUERY
        SELECT * FROM public.return_bathroom_data_primary_full_row(p_id);
        RETURN;
    END IF;

    PERFORM public.lock_account_row(v_account_id);

    SELECT accounts.reputation_score
    INTO v_reputation
    FROM public.accounts
    WHERE accounts.id = v_account_id;

    IF v_reputation IS NULL THEN
        RAISE EXCEPTION 'account required';
    END IF;

    IF v_reputation < -20 THEN
        RAISE EXCEPTION 'reputation too low to vote or rate';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM bathroom_data_primary AS b
        WHERE b.id = p_id
    )
    INTO v_exists;

    IF NOT v_exists THEN
        RETURN;
    END IF;

    SELECT ratings.stars
    INTO v_previous_stars
    FROM public.account_bathroom_ratings AS ratings
    WHERE ratings.account_id = v_account_id
        AND ratings.bathroom_id = p_id;
    v_has_rating := FOUND;

    PERFORM public.assert_account_bathroom_update_rate_limit(v_account_id);

    IF v_has_rating AND v_previous_stars = p_stars THEN
        RETURN QUERY
        SELECT * FROM public.return_bathroom_data_primary_full_row(p_id);
        RETURN;
    END IF;

    UPDATE bathroom_data_primary AS b
    SET
        rating_1_count = GREATEST(
            0,
            b.rating_1_count
                + CASE WHEN p_stars = 1 THEN 1 ELSE 0 END
                + CASE WHEN v_previous_stars = 1 THEN -1 ELSE 0 END
        ),
        rating_2_count = GREATEST(
            0,
            b.rating_2_count
                + CASE WHEN p_stars = 2 THEN 1 ELSE 0 END
                + CASE WHEN v_previous_stars = 2 THEN -1 ELSE 0 END
        ),
        rating_3_count = GREATEST(
            0,
            b.rating_3_count
                + CASE WHEN p_stars = 3 THEN 1 ELSE 0 END
                + CASE WHEN v_previous_stars = 3 THEN -1 ELSE 0 END
        ),
        rating_4_count = GREATEST(
            0,
            b.rating_4_count
                + CASE WHEN p_stars = 4 THEN 1 ELSE 0 END
                + CASE WHEN v_previous_stars = 4 THEN -1 ELSE 0 END
        ),
        rating_5_count = GREATEST(
            0,
            b.rating_5_count
                + CASE WHEN p_stars = 5 THEN 1 ELSE 0 END
                + CASE WHEN v_previous_stars = 5 THEN -1 ELSE 0 END
        ),
        version = b.version + 1
    WHERE b.id = p_id;

    INSERT INTO public.account_bathroom_ratings (
        account_id,
        bathroom_id,
        stars,
        rated_at
    )
    VALUES (v_account_id, p_id, p_stars, now())
    ON CONFLICT (account_id, bathroom_id) DO UPDATE
    SET
        stars = EXCLUDED.stars,
        rated_at = EXCLUDED.rated_at;

    PERFORM public.apply_account_bathroom_action_reputation(v_account_id, p_id);

    RETURN QUERY
    SELECT * FROM public.return_bathroom_data_primary_full_row(p_id);
END;
$$;

DROP FUNCTION IF EXISTS increment_bathroom_data_primary_existence_vote_count(bigint, boolean);

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
    v_reputation integer;
    v_pending boolean;
    v_prev_for boolean;
    v_prev_weight real;
    v_has_previous boolean := false;
    v_old_signed real;
    v_new_signed real;
    v_delta real;
    v_exists boolean;
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

    IF v_account_id IS NULL THEN
        SELECT b.deletion_wait_started_timestamp IS NOT NULL
        INTO v_pending
        FROM bathroom_data_primary AS b
        WHERE b.id = p_id;

        IF NOT FOUND THEN
            RETURN;
        END IF;

        IF NOT p_vote_for_exists AND v_pending THEN
            RETURN QUERY
            SELECT * FROM public.return_bathroom_data_primary_full_row(p_id);
            RETURN;
        END IF;

        UPDATE bathroom_data_primary AS b
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
        WHERE b.id = p_id;

        RETURN QUERY
        SELECT * FROM public.return_bathroom_data_primary_full_row(p_id);
        RETURN;
    END IF;

    PERFORM public.lock_account_row(v_account_id);

    SELECT accounts.reputation_score
    INTO v_reputation
    FROM public.accounts
    WHERE accounts.id = v_account_id;

    IF v_reputation IS NULL THEN
        RAISE EXCEPTION 'account required';
    END IF;

    IF v_reputation < -20 THEN
        RAISE EXCEPTION 'reputation too low to vote or rate';
    END IF;

    v_weight := public.bathroom_existence_vote_weight(v_reputation);

    SELECT EXISTS (
        SELECT 1
        FROM bathroom_data_primary AS b
        WHERE b.id = p_id
    )
    INTO v_exists;

    IF NOT v_exists THEN
        RETURN;
    END IF;

    SELECT b.deletion_wait_started_timestamp IS NOT NULL
    INTO v_pending
    FROM bathroom_data_primary AS b
    WHERE b.id = p_id;

    IF NOT p_vote_for_exists AND v_pending THEN
        PERFORM public.assert_account_bathroom_update_rate_limit(v_account_id);
        RETURN QUERY
        SELECT * FROM public.return_bathroom_data_primary_full_row(p_id);
        RETURN;
    END IF;

    SELECT votes.vote_for_exists, votes.applied_weight
    INTO v_prev_for, v_prev_weight
    FROM public.account_bathroom_existence_votes AS votes
    WHERE votes.account_id = v_account_id
        AND votes.bathroom_id = p_id;
    v_has_previous := FOUND;

    IF v_has_previous AND v_prev_for IS NOT DISTINCT FROM p_vote_for_exists THEN
        PERFORM public.assert_account_bathroom_update_rate_limit(v_account_id);
        RETURN QUERY
        SELECT * FROM public.return_bathroom_data_primary_full_row(p_id);
        RETURN;
    END IF;

    PERFORM public.assert_account_bathroom_update_rate_limit(v_account_id);

    v_old_signed := 0;
    IF v_has_previous THEN
        v_old_signed := CASE
            WHEN v_prev_for THEN v_prev_weight
            ELSE -v_prev_weight
        END;
    END IF;
    v_new_signed := CASE
        WHEN p_vote_for_exists THEN v_weight
        ELSE -v_weight
    END;
    v_delta := v_new_signed - v_old_signed;

    UPDATE bathroom_data_primary AS b
    SET
        existence_value = b.existence_value + v_delta,
        deletion_wait_started_timestamp = CASE
            WHEN p_vote_for_exists AND b.deletion_wait_started_timestamp IS NOT NULL THEN
                NULL
            WHEN NOT p_vote_for_exists
                AND b.deletion_wait_started_timestamp IS NULL
                AND (b.existence_value + v_delta) <= -10.0 THEN
                CURRENT_TIMESTAMP
            ELSE
                b.deletion_wait_started_timestamp
        END,
        version = b.version + 1
    WHERE b.id = p_id;

    INSERT INTO public.account_bathroom_existence_votes (
        account_id,
        bathroom_id,
        vote_for_exists,
        applied_weight,
        voted_at
    )
    VALUES (v_account_id, p_id, p_vote_for_exists, v_weight, now())
    ON CONFLICT (account_id, bathroom_id) DO UPDATE
    SET
        vote_for_exists = EXCLUDED.vote_for_exists,
        applied_weight = EXCLUDED.applied_weight,
        voted_at = EXCLUDED.voted_at;

    PERFORM public.apply_account_bathroom_action_reputation(v_account_id, p_id);

    RETURN QUERY
    SELECT * FROM public.return_bathroom_data_primary_full_row(p_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_own_bathroom_existence_vote(p_id bigint)
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
    v_reputation integer;
    v_prev_for boolean;
    v_prev_weight real;
    v_has_previous boolean := false;
    v_delta real;
    v_exists boolean;
BEGIN
    IF p_id IS NULL OR p_id <= 0 THEN
        RAISE EXCEPTION 'invalid bathroom id';
    END IF;

    SELECT checked.account_id, checked.vote_weight
    INTO v_account_id, v_weight
    FROM public.assert_can_vote_or_rate() AS checked;

    IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'account required';
    END IF;

    PERFORM public.lock_account_row(v_account_id);

    SELECT accounts.reputation_score
    INTO v_reputation
    FROM public.accounts
    WHERE accounts.id = v_account_id;

    IF v_reputation IS NULL THEN
        RAISE EXCEPTION 'account required';
    END IF;

    IF v_reputation < -20 THEN
        RAISE EXCEPTION 'reputation too low to vote or rate';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM bathroom_data_primary AS b
        WHERE b.id = p_id
    )
    INTO v_exists;

    IF NOT v_exists THEN
        RETURN;
    END IF;

    PERFORM public.assert_account_bathroom_update_rate_limit(v_account_id);

    SELECT votes.vote_for_exists, votes.applied_weight
    INTO v_prev_for, v_prev_weight
    FROM public.account_bathroom_existence_votes AS votes
    WHERE votes.account_id = v_account_id
        AND votes.bathroom_id = p_id;
    v_has_previous := FOUND;

    IF NOT v_has_previous THEN
        RETURN QUERY
        SELECT * FROM public.return_bathroom_data_primary_full_row(p_id);
        RETURN;
    END IF;

    v_delta := -CASE
        WHEN v_prev_for THEN v_prev_weight
        ELSE -v_prev_weight
    END;

    UPDATE bathroom_data_primary AS b
    SET
        existence_value = b.existence_value + v_delta,
        deletion_wait_started_timestamp = CASE
            WHEN v_prev_for = false THEN
                NULL
            WHEN v_prev_for = true
                AND b.deletion_wait_started_timestamp IS NULL
                AND (b.existence_value + v_delta) <= -10.0 THEN
                CURRENT_TIMESTAMP
            ELSE
                b.deletion_wait_started_timestamp
        END,
        version = b.version + 1
    WHERE b.id = p_id;

    DELETE FROM public.account_bathroom_existence_votes AS votes
    WHERE votes.account_id = v_account_id
        AND votes.bathroom_id = p_id;

    RETURN QUERY
    SELECT * FROM public.return_bathroom_data_primary_full_row(p_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_own_bathroom_rating(p_id bigint)
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
    v_reputation integer;
    v_previous_stars integer;
    v_has_rating boolean := false;
    v_exists boolean;
BEGIN
    IF p_id IS NULL OR p_id <= 0 THEN
        RAISE EXCEPTION 'invalid bathroom id';
    END IF;

    SELECT checked.account_id, checked.vote_weight
    INTO v_account_id, v_weight
    FROM public.assert_can_vote_or_rate() AS checked;

    IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'account required';
    END IF;

    PERFORM public.lock_account_row(v_account_id);

    SELECT accounts.reputation_score
    INTO v_reputation
    FROM public.accounts
    WHERE accounts.id = v_account_id;

    IF v_reputation IS NULL THEN
        RAISE EXCEPTION 'account required';
    END IF;

    IF v_reputation < -20 THEN
        RAISE EXCEPTION 'reputation too low to vote or rate';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM bathroom_data_primary AS b
        WHERE b.id = p_id
    )
    INTO v_exists;

    IF NOT v_exists THEN
        RETURN;
    END IF;

    PERFORM public.assert_account_bathroom_update_rate_limit(v_account_id);

    SELECT ratings.stars
    INTO v_previous_stars
    FROM public.account_bathroom_ratings AS ratings
    WHERE ratings.account_id = v_account_id
        AND ratings.bathroom_id = p_id;
    v_has_rating := FOUND;

    IF NOT v_has_rating THEN
        RETURN QUERY
        SELECT * FROM public.return_bathroom_data_primary_full_row(p_id);
        RETURN;
    END IF;

    UPDATE bathroom_data_primary AS b
    SET
        rating_1_count = GREATEST(
            0,
            b.rating_1_count + CASE WHEN v_previous_stars = 1 THEN -1 ELSE 0 END
        ),
        rating_2_count = GREATEST(
            0,
            b.rating_2_count + CASE WHEN v_previous_stars = 2 THEN -1 ELSE 0 END
        ),
        rating_3_count = GREATEST(
            0,
            b.rating_3_count + CASE WHEN v_previous_stars = 3 THEN -1 ELSE 0 END
        ),
        rating_4_count = GREATEST(
            0,
            b.rating_4_count + CASE WHEN v_previous_stars = 4 THEN -1 ELSE 0 END
        ),
        rating_5_count = GREATEST(
            0,
            b.rating_5_count + CASE WHEN v_previous_stars = 5 THEN -1 ELSE 0 END
        ),
        version = b.version + 1
    WHERE b.id = p_id;

    DELETE FROM public.account_bathroom_ratings AS ratings
    WHERE ratings.account_id = v_account_id
        AND ratings.bathroom_id = p_id;

    RETURN QUERY
    SELECT * FROM public.return_bathroom_data_primary_full_row(p_id);
END;
$$;

DROP FUNCTION IF EXISTS public.apply_account_bathroom_action_reputation(uuid);

CREATE OR REPLACE FUNCTION public.get_own_bathroom_interaction(p_id bigint)
RETURNS TABLE (
    vote_for_exists boolean,
    voted_at timestamp,
    vote_on_cooldown boolean,
    rating_stars integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
    v_account uuid;
BEGIN
    IF p_id IS NULL OR p_id <= 0 THEN
        RAISE EXCEPTION 'invalid bathroom id';
    END IF;

    v_account := auth.uid();
    IF v_account IS NULL THEN
        RAISE EXCEPTION 'account required';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.accounts
        WHERE accounts.id = v_account
    ) THEN
        RAISE EXCEPTION 'account required';
    END IF;

    RETURN QUERY
    SELECT
        votes.vote_for_exists,
        votes.voted_at,
        COALESCE(
            votes.voted_at > now() - interval '1 month',
            false
        ),
        ratings.stars
    FROM (SELECT 1) AS anchor
    LEFT JOIN public.account_bathroom_existence_votes AS votes
        ON votes.account_id = v_account
        AND votes.bathroom_id = p_id
    LEFT JOIN public.account_bathroom_ratings AS ratings
        ON ratings.account_id = v_account
        AND ratings.bathroom_id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bathroom_existence_vote_weight(integer)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lock_account_row(uuid)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_account_bathroom_update_rate_limit(uuid)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_account_bathroom_action_reputation(uuid, bigint)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bathroom_data_primary_full_row(bigint)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.return_bathroom_data_primary_full_row(bigint)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.drift_account_reputation_toward_zero()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.drift_account_reputation_toward_zero() TO service_role;
REVOKE ALL ON FUNCTION decay_bathroom_data_primary_existence_value()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION decay_bathroom_data_primary_existence_value() TO service_role;
REVOKE ALL ON FUNCTION delete_expired_pending_deletion_bathrooms()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_expired_pending_deletion_bathrooms() TO service_role;

REVOKE ALL ON FUNCTION increment_bathroom_data_primary_rating_count(bigint, integer)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_bathroom_data_primary_rating_count(bigint, integer)
    TO authenticated, service_role;
REVOKE ALL ON FUNCTION increment_bathroom_data_primary_existence_vote_count(bigint, boolean)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_bathroom_data_primary_existence_vote_count(bigint, boolean)
    TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.clear_own_bathroom_existence_vote(bigint)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_own_bathroom_existence_vote(bigint)
    TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.clear_own_bathroom_rating(bigint)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_own_bathroom_rating(bigint)
    TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_own_bathroom_interaction(bigint)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_bathroom_interaction(bigint)
    TO authenticated, service_role;

ALTER TABLE public.account_bathroom_existence_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_bathroom_existence_votes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.account_bathroom_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_bathroom_ratings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.account_bathroom_update_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_bathroom_update_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.server_db_schema_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_db_schema_version FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_bathroom_existence_votes_service_role_all
    ON public.account_bathroom_existence_votes;
CREATE POLICY account_bathroom_existence_votes_service_role_all
    ON public.account_bathroom_existence_votes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS account_bathroom_ratings_service_role_all
    ON public.account_bathroom_ratings;
CREATE POLICY account_bathroom_ratings_service_role_all
    ON public.account_bathroom_ratings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS account_bathroom_update_events_service_role_all
    ON public.account_bathroom_update_events;
CREATE POLICY account_bathroom_update_events_service_role_all
    ON public.account_bathroom_update_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS bathroom_data_primary_delete_account
    ON public.bathroom_data_primary;
REVOKE DELETE ON TABLE public.bathroom_data_primary FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.account_bathroom_existence_votes FROM anon, authenticated;
REVOKE ALL ON TABLE public.account_bathroom_ratings FROM anon, authenticated;
REVOKE ALL ON TABLE public.account_bathroom_update_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.account_bathroom_actions FROM anon, authenticated;
REVOKE ALL ON TABLE public.server_db_schema_version FROM anon, authenticated;
GRANT ALL ON TABLE public.account_bathroom_existence_votes TO service_role;
GRANT ALL ON TABLE public.account_bathroom_ratings TO service_role;
GRANT ALL ON TABLE public.account_bathroom_update_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.account_bathroom_update_events_id_seq TO service_role;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 25)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
