-- Comment rows expose the author's profile picture, and any account profile
-- can be opened from a comment avatar.
-- Server schema version 28.

BEGIN;

DROP FUNCTION IF EXISTS public.list_bathroom_data_comments(bigint);

CREATE OR REPLACE FUNCTION public.list_bathroom_data_comments(p_id bigint)
RETURNS TABLE (
    account_id uuid,
    content text,
    rating_stars integer,
    profile_picture_mime text,
    profile_picture_base64 text
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
        ratings.stars,
        accounts.profile_picture_mime,
        CASE
            WHEN accounts.profile_picture IS NULL THEN NULL
            ELSE replace(encode(accounts.profile_picture, 'base64'), E'\n', '')
        END
    FROM public.bathroom_data_comments AS comments
    JOIN public.accounts AS accounts
        ON accounts.id = comments.account_id
    LEFT JOIN public.account_bathroom_ratings AS ratings
        ON ratings.account_id = comments.account_id
        AND ratings.bathroom_id = comments.bathroom_id
    WHERE comments.bathroom_id = p_id
    ORDER BY comments.account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_account_profile(p_id uuid)
RETURNS TABLE (
    id uuid,
    username text,
    reputation_score integer,
    profile_picture_mime text,
    profile_picture_base64 text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF p_id IS NULL THEN
        RAISE EXCEPTION 'invalid account id';
    END IF;

    RETURN QUERY
    SELECT
        accounts.id,
        accounts.username,
        accounts.reputation_score,
        accounts.profile_picture_mime,
        CASE
            WHEN accounts.profile_picture IS NULL THEN NULL
            ELSE replace(encode(accounts.profile_picture, 'base64'), E'\n', '')
        END
    FROM public.accounts AS accounts
    WHERE accounts.id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.list_bathroom_data_comments(bigint)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_bathroom_data_comments(bigint)
    TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_account_profile(uuid)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_account_profile(uuid)
    TO anon, authenticated, service_role;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 28)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';

COMMIT;
