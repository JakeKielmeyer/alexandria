-- Alexandria — explicit Data API grants for all public tables.
--
-- From October 30 2026 Supabase will enforce the new default where tables in
-- "public" are NOT exposed to PostgREST/supabase-js unless an explicit GRANT
-- exists. This migration adds those grants pre-emptively so no 42501 errors
-- appear after the deadline. RLS policies (already in place) continue to
-- enforce row-level ownership; these grants only open the table-level door.
--
-- Roles:
--   authenticated — logged-in users (creators + readers)
--   anon          — unauthenticated readers (published stories only, via RLS)
--
-- Idempotent: GRANTs are safe to re-run.

-- ── authenticated ─────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chunks  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.panels  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.layers  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spreads TO authenticated;

-- users rows are created by a server-side signup trigger; client may only read
-- public profile columns and update their own row.
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- ── anon ──────────────────────────────────────────────────────────────────────
-- RLS SELECT policies already restrict anon to published stories and their
-- associated content. These grants open the door; RLS locks the rows.

GRANT SELECT ON public.stories TO anon;
GRANT SELECT ON public.chunks  TO anon;
GRANT SELECT ON public.panels  TO anon;
GRANT SELECT ON public.layers  TO anon;
GRANT SELECT ON public.assets  TO anon;
GRANT SELECT ON public.spreads TO anon;
GRANT SELECT ON public.users   TO anon;
