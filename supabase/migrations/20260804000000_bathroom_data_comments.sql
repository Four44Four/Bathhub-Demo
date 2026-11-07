-- Bathroom comments attached to an account's rating.
-- Server schema version 27.
--
-- Adding, overwriting, and deleting a comment happens inside the bathroom
-- rating RPCs, after assert_account_bathroom_update_rate_limit. That is the
-- same 20-per-minute bathroom update cap as SERVER_RATE_LIMITS.bathroomUpdate.
-- Direct table writes stay revoked so a comment cannot skip that cap.

BEGIN;

CREATE TABLE IF NOT EXISTS public.bathroom_data_comments (
    bathroom_id bigint NOT NULL,
    account_id uuid NOT NULL,
    content text NOT NULL,
    PRIMARY KEY (bathroom_id, account_id),
    CONSTRAINT bathroom_data_comments_content_not_blank
        CHECK (btrim(content) <> ''),
    CONSTRAINT bathroom_data_comments_bathroom_id_fkey
        FOREIGN KEY (bathroom_id)
        REFERENCES public.bathroom_data_primary (id)
        ON DELETE CASCADE,
    CONSTRAINT bathroom_data_comments_account_id_fkey
        FOREIGN KEY (account_id)
        REFERENCES public.accounts (id)
        ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION public.write_bathroom_data_comment(
    p_bathroom_id bigint,
    p_account_id uuid,
    p_comment text,
    p_delete_comment boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF p_delete_comment THEN
        DELETE FROM public.bathroom_data_comments AS comments
        WHERE comments.bathroom_id = p_bathroom_id
            AND comments.account_id = p_account_id;
        RETURN;
    END IF;

    IF p_comment IS NULL THEN
        RETURN;
    END IF;

    IF btrim(p_comment) = '' THEN
        DELETE FROM public.bathroom_data_comments AS comments
        WHERE comments.bathroom_id = p_bathroom_id
            AND comments.account_id = p_account_id;
        RETURN;
    END IF;

    INSERT INTO public.bathroom_data_comments (
        bathroom_id,
        account_id,
        content
    )
    VALUES (p_bathroom_id, p_account_id, btrim(p_comment))
    ON CONFLICT (bathroom_id, account_id) DO UPDATE
    SET content = EXCLUDED.content;
END;
$$;

DROP FUNCTION IF EXISTS increment_bathroom_data_primary_rating_count(bigint, integer);
DROP FUNCTION IF EXISTS increment_bathroom_data_primary_rating_count(bigint, integer, text);

CREATE OR REPLACE FUNCTION increment_bathroom_data_primary_rating_count(
    p_id bigint,
    p_stars integer,
    p_comment text DEFAULT NULL
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

    IF p_comment IS NOT NULL AND btrim(p_comment) <> '' THEN
        PERFORM public.write_bathroom_data_comment(
            p_id,
            v_account_id,
            p_comment,
            false
        );
    END IF;

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

DROP FUNCTION IF EXISTS public.clear_own_bathroom_rating(bigint);
DROP FUNCTION IF EXISTS public.clear_own_bathroom_rating(bigint, text, boolean);

CREATE OR REPLACE FUNCTION public.clear_own_bathroom_rating(
    p_id bigint,
    p_comment text DEFAULT NULL,
    p_delete_comment boolean DEFAULT false
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

    IF p_delete_comment OR p_comment IS NOT NULL THEN
        PERFORM public.write_bathroom_data_comment(
            p_id,
            v_account_id,
            p_comment,
            COALESCE(p_delete_comment, false)
        );
    END IF;

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

CREATE OR REPLACE FUNCTION public.list_bathroom_data_comments(p_id bigint)
RETURNS TABLE (
    account_id uuid,
    content text,
    rating_stars integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF p_id IS NULL OR p_id <= 0 THEN
        RAISE EXCEPTION 'invalid bathroom id';
    END IF;

    RETURN QUERY
    SELECT
        comments.account_id,
        comments.content,
        ratings.stars
    FROM public.bathroom_data_comments AS comments
    LEFT JOIN public.account_bathroom_ratings AS ratings
        ON ratings.account_id = comments.account_id
        AND ratings.bathroom_id = comments.bathroom_id
    WHERE comments.bathroom_id = p_id
    ORDER BY comments.account_id;
END;
$$;

REVOKE ALL ON FUNCTION public.write_bathroom_data_comment(bigint, uuid, text, boolean)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_bathroom_data_comment(bigint, uuid, text, boolean)
    TO service_role;

REVOKE ALL ON FUNCTION increment_bathroom_data_primary_rating_count(bigint, integer, text)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_bathroom_data_primary_rating_count(bigint, integer, text)
    TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.clear_own_bathroom_rating(bigint, text, boolean)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_own_bathroom_rating(bigint, text, boolean)
    TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.list_bathroom_data_comments(bigint)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_bathroom_data_comments(bigint)
    TO anon, authenticated, service_role;

ALTER TABLE public.bathroom_data_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bathroom_data_comments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bathroom_data_comments_service_role_all
    ON public.bathroom_data_comments;
CREATE POLICY bathroom_data_comments_service_role_all
    ON public.bathroom_data_comments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

REVOKE ALL ON TABLE public.bathroom_data_comments FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.bathroom_data_comments TO service_role;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 27)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';

COMMIT;
