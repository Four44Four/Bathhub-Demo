-- Explicit Data API grants for bathroom_data_primary.
-- Supabase CLI 2.106.0+ revokes default public-schema grants when
-- [api].auto_expose_new_tables is unset (new default: false).

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bathroom_data_primary
    TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON SEQUENCE public.bathroom_data_primary_id_seq
    TO anon, authenticated, service_role;
