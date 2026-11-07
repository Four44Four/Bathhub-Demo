-- Account profile pictures.
-- Server schema version 26.
--
-- Signed-in accounts store one image. The upload endpoint and this function
-- both require an image MIME type, pixel edges under 512x512, then a file
-- size under 1 MB (1048576 bytes). Anonymous callers cannot write pictures.

BEGIN;

ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS profile_picture bytea,
    ADD COLUMN IF NOT EXISTS profile_picture_mime text;

ALTER TABLE public.accounts
    DROP CONSTRAINT IF EXISTS accounts_profile_picture_payload;
ALTER TABLE public.accounts
    ADD CONSTRAINT accounts_profile_picture_payload
    CHECK (
        (
            profile_picture IS NULL
            AND profile_picture_mime IS NULL
        )
        OR (
            profile_picture IS NOT NULL
            AND profile_picture_mime IS NOT NULL
            AND profile_picture_mime ~ '^image/[a-z0-9][a-z0-9.+-]*$'
            AND octet_length(profile_picture) > 0
            AND octet_length(profile_picture) < 1048576
        )
    );

CREATE OR REPLACE FUNCTION public.profile_image_dimensions_allowed(
    p_mime text,
    p_bytes bytea
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $profile_image$
DECLARE
    v_length integer;
    v_width bigint;
    v_height bigint;
    v_offset integer;
    v_marker integer;
    v_segment integer;
    v_text text;
    v_width_text text;
    v_height_text text;
    v_bits bigint;
BEGIN
    IF p_bytes IS NULL THEN
        RETURN false;
    END IF;
    v_length := octet_length(p_bytes);

    IF p_mime = 'image/png' THEN
        IF v_length < 24 THEN
            RETURN false;
        END IF;
        IF get_byte(p_bytes, 0) <> 137
            OR get_byte(p_bytes, 1) <> 80
            OR get_byte(p_bytes, 2) <> 78
            OR get_byte(p_bytes, 3) <> 71
            OR get_byte(p_bytes, 4) <> 13
            OR get_byte(p_bytes, 5) <> 10
            OR get_byte(p_bytes, 6) <> 26
            OR get_byte(p_bytes, 7) <> 10
            OR get_byte(p_bytes, 12) <> 73
            OR get_byte(p_bytes, 13) <> 72
            OR get_byte(p_bytes, 14) <> 68
            OR get_byte(p_bytes, 15) <> 82
        THEN
            RETURN false;
        END IF;
        v_width := (
            get_byte(p_bytes, 16)::bigint * 16777216
            + get_byte(p_bytes, 17)::bigint * 65536
            + get_byte(p_bytes, 18)::bigint * 256
            + get_byte(p_bytes, 19)::bigint
        );
        v_height := (
            get_byte(p_bytes, 20)::bigint * 16777216
            + get_byte(p_bytes, 21)::bigint * 65536
            + get_byte(p_bytes, 22)::bigint * 256
            + get_byte(p_bytes, 23)::bigint
        );
    ELSIF p_mime = 'image/gif' THEN
        IF v_length < 10 THEN
            RETURN false;
        END IF;
        IF get_byte(p_bytes, 0) <> 71
            OR get_byte(p_bytes, 1) <> 73
            OR get_byte(p_bytes, 2) <> 70
            OR get_byte(p_bytes, 3) <> 56
            OR get_byte(p_bytes, 5) <> 97
            OR (get_byte(p_bytes, 4) <> 55 AND get_byte(p_bytes, 4) <> 57)
        THEN
            RETURN false;
        END IF;
        v_width := get_byte(p_bytes, 6)::bigint + get_byte(p_bytes, 7)::bigint * 256;
        v_height := get_byte(p_bytes, 8)::bigint + get_byte(p_bytes, 9)::bigint * 256;
    ELSIF p_mime = 'image/bmp' THEN
        IF v_length < 26 OR get_byte(p_bytes, 0) <> 66 OR get_byte(p_bytes, 1) <> 77 THEN
            RETURN false;
        END IF;
        v_width := (
            get_byte(p_bytes, 18)::bigint
            + get_byte(p_bytes, 19)::bigint * 256
            + get_byte(p_bytes, 20)::bigint * 65536
            + get_byte(p_bytes, 21)::bigint * 16777216
        );
        v_height := (
            get_byte(p_bytes, 22)::bigint
            + get_byte(p_bytes, 23)::bigint * 256
            + get_byte(p_bytes, 24)::bigint * 65536
            + get_byte(p_bytes, 25)::bigint * 16777216
        );
        IF v_width >= 2147483648 THEN
            v_width := v_width - 4294967296;
        END IF;
        IF v_height >= 2147483648 THEN
            v_height := v_height - 4294967296;
        END IF;
        v_width := abs(v_width);
        v_height := abs(v_height);
    ELSIF p_mime = 'image/jpeg' THEN
        IF v_length < 4 OR get_byte(p_bytes, 0) <> 255 OR get_byte(p_bytes, 1) <> 216 THEN
            RETURN false;
        END IF;
        v_offset := 2;
        WHILE v_offset + 3 < v_length LOOP
            IF get_byte(p_bytes, v_offset) <> 255 THEN
                RETURN false;
            END IF;
            WHILE v_offset < v_length AND get_byte(p_bytes, v_offset) = 255 LOOP
                v_offset := v_offset + 1;
            END LOOP;
            IF v_offset >= v_length THEN
                RETURN false;
            END IF;
            v_marker := get_byte(p_bytes, v_offset);
            v_offset := v_offset + 1;
            IF v_marker = 217 OR v_marker = 218 THEN
                RETURN false;
            END IF;
            IF v_offset + 1 >= v_length THEN
                RETURN false;
            END IF;
            v_segment := get_byte(p_bytes, v_offset) * 256 + get_byte(p_bytes, v_offset + 1);
            IF v_segment < 2 OR v_offset + v_segment > v_length THEN
                RETURN false;
            END IF;
            IF v_marker IN (192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207) THEN
                IF v_offset + 7 >= v_length THEN
                    RETURN false;
                END IF;
                v_height := get_byte(p_bytes, v_offset + 3)::bigint * 256
                    + get_byte(p_bytes, v_offset + 4)::bigint;
                v_width := get_byte(p_bytes, v_offset + 5)::bigint * 256
                    + get_byte(p_bytes, v_offset + 6)::bigint;
                EXIT;
            END IF;
            v_offset := v_offset + v_segment;
        END LOOP;
        IF v_width IS NULL OR v_height IS NULL THEN
            RETURN false;
        END IF;
    ELSIF p_mime = 'image/webp' THEN
        IF v_length < 16
            OR get_byte(p_bytes, 0) <> 82
            OR get_byte(p_bytes, 1) <> 73
            OR get_byte(p_bytes, 2) <> 70
            OR get_byte(p_bytes, 3) <> 70
            OR get_byte(p_bytes, 8) <> 87
            OR get_byte(p_bytes, 9) <> 69
            OR get_byte(p_bytes, 10) <> 66
            OR get_byte(p_bytes, 11) <> 80
        THEN
            RETURN false;
        END IF;
        IF get_byte(p_bytes, 12) = 86
            AND get_byte(p_bytes, 13) = 80
            AND get_byte(p_bytes, 14) = 56
            AND get_byte(p_bytes, 15) = 88
        THEN
            IF v_length < 30 THEN
                RETURN false;
            END IF;
            v_width := 1 + get_byte(p_bytes, 24)::bigint
                + get_byte(p_bytes, 25)::bigint * 256
                + get_byte(p_bytes, 26)::bigint * 65536;
            v_height := 1 + get_byte(p_bytes, 27)::bigint
                + get_byte(p_bytes, 28)::bigint * 256
                + get_byte(p_bytes, 29)::bigint * 65536;
        ELSIF get_byte(p_bytes, 12) = 86
            AND get_byte(p_bytes, 13) = 80
            AND get_byte(p_bytes, 14) = 56
            AND get_byte(p_bytes, 15) = 32
        THEN
            IF v_length < 30
                OR get_byte(p_bytes, 23) <> 157
                OR get_byte(p_bytes, 24) <> 1
                OR get_byte(p_bytes, 25) <> 42
            THEN
                RETURN false;
            END IF;
            v_width := (get_byte(p_bytes, 26)::bigint + get_byte(p_bytes, 27)::bigint * 256) & 16383;
            v_height := (get_byte(p_bytes, 28)::bigint + get_byte(p_bytes, 29)::bigint * 256) & 16383;
        ELSIF get_byte(p_bytes, 12) = 86
            AND get_byte(p_bytes, 13) = 80
            AND get_byte(p_bytes, 14) = 56
            AND get_byte(p_bytes, 15) = 76
        THEN
            IF v_length < 25 OR get_byte(p_bytes, 20) <> 47 THEN
                RETURN false;
            END IF;
            v_bits := get_byte(p_bytes, 21)::bigint
                + get_byte(p_bytes, 22)::bigint * 256
                + get_byte(p_bytes, 23)::bigint * 65536
                + get_byte(p_bytes, 24)::bigint * 16777216;
            v_width := (v_bits & 16383) + 1;
            v_height := ((v_bits >> 14) & 16383) + 1;
        ELSE
            RETURN false;
        END IF;
    ELSIF p_mime = 'image/svg+xml' THEN
        BEGIN
            v_text := convert_from(p_bytes, 'UTF8');
        EXCEPTION
            WHEN others THEN
                RETURN false;
        END;
        IF v_text !~* '<svg[[:space:]>]' THEN
            RETURN false;
        END IF;
        v_width_text := substring(
            v_text from 'width[[:space:]]*=[[:space:]]*["'']([0-9]+)(px)?["'']'
        );
        v_height_text := substring(
            v_text from 'height[[:space:]]*=[[:space:]]*["'']([0-9]+)(px)?["'']'
        );
        IF v_width_text IS NULL OR v_height_text IS NULL OR v_width_text !~ '^[0-9]+$' OR v_height_text !~ '^[0-9]+$' THEN
            RETURN false;
        END IF;
        v_width := v_width_text::bigint;
        v_height := v_height_text::bigint;
    ELSE
        RETURN false;
    END IF;

    RETURN v_width IS NOT NULL
        AND v_height IS NOT NULL
        AND v_width >= 1
        AND v_height >= 1
        AND v_width < 512
        AND v_height < 512;
END;
$profile_image$;

REVOKE ALL ON FUNCTION public.profile_image_dimensions_allowed(text, bytea)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.profile_image_dimensions_allowed(text, bytea)
    TO service_role;
DO $$
BEGIN
    EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.profile_image_dimensions_allowed(text, bytea) TO %I',
        current_user
    );
END $$;

DROP FUNCTION IF EXISTS public.set_own_profile_picture(text, text);

CREATE FUNCTION public.set_own_profile_picture(
    p_mime text,
    p_image_base64 text
)
RETURNS TABLE (
    id uuid,
    username text,
    reputation_score integer,
    profile_picture_mime text,
    profile_picture_base64 text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $set_profile_picture$
DECLARE
    v_mime text;
    v_bytes bytea;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.accounts
        WHERE accounts.id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'account required';
    END IF;

    v_mime := lower(btrim(split_part(coalesce(p_mime, ''), ';', 1)));
    IF v_mime IN ('image/jpg', 'image/pjpeg') THEN
        v_mime := 'image/jpeg';
    ELSIF v_mime = 'image/x-ms-bmp' THEN
        v_mime := 'image/bmp';
    END IF;

    IF v_mime !~ '^image/[a-z0-9][a-z0-9.+-]*$' THEN
        RAISE EXCEPTION 'Uploaded file must be an image';
    END IF;

    BEGIN
        v_bytes := decode(p_image_base64, 'base64');
    EXCEPTION
        WHEN others THEN
            RAISE EXCEPTION 'Image dimensions must be under 512x512';
    END;

    IF NOT public.profile_image_dimensions_allowed(v_mime, v_bytes) THEN
        RAISE EXCEPTION 'Image dimensions must be under 512x512';
    END IF;

    IF octet_length(v_bytes) >= 1048576 THEN
        RAISE EXCEPTION 'Image file size must be under 1 MB';
    END IF;

    UPDATE public.accounts
    SET
        profile_picture = v_bytes,
        profile_picture_mime = v_mime
    WHERE accounts.id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'account required';
    END IF;

    RETURN QUERY
    SELECT
        accounts.id,
        accounts.username,
        accounts.reputation_score,
        accounts.profile_picture_mime,
        replace(encode(accounts.profile_picture, 'base64'), E'\n', '')
    FROM public.accounts
    WHERE accounts.id = auth.uid();
END;
$set_profile_picture$;

REVOKE ALL ON FUNCTION public.set_own_profile_picture(text, text)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_own_profile_picture(text, text)
    TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_own_account();

CREATE FUNCTION public.get_own_account()
RETURNS TABLE (
    id uuid,
    username text,
    reputation_score integer,
    profile_picture_mime text,
    profile_picture_base64 text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, auth, pg_catalog
AS $$
    SELECT
        accounts.id,
        accounts.username,
        accounts.reputation_score,
        accounts.profile_picture_mime,
        CASE
            WHEN accounts.profile_picture IS NULL THEN NULL
            ELSE replace(encode(accounts.profile_picture, 'base64'), E'\n', '')
        END
    FROM public.accounts
    WHERE accounts.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_own_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_account() TO authenticated, service_role;

INSERT INTO server_db_schema_version (singleton, version)
VALUES (TRUE, 26)
ON CONFLICT (singleton) DO UPDATE
SET version = EXCLUDED.version;

COMMIT;
