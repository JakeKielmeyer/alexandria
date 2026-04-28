-- Alexandria — Row Level Security policies.
--
-- Design:
--   * stories: owner can do anything with their own row. Public can SELECT
--     only when is_published=true.
--   * chunks, panels, layers: ownership flows through the parent stories row.
--     Public SELECT is allowed only when the parent story is_published.
--   * users: anyone may SELECT the public profile columns. Only the row owner
--     (auth.uid() = id) may UPDATE their own row. No INSERT/DELETE from the
--     client — user rows are created by the signup trigger only.
--   * Storage bucket "panels": upload paths are `<story_id>/<panel_id>/<file>`.
--     Only the story owner may INSERT/UPDATE/DELETE objects under their own
--     story_id. Public may SELECT objects whose parent story is_published.
--
-- Idempotent: uses IF EXISTS / IF NOT EXISTS and DROP-before-CREATE for
-- policies so this migration can be re-applied safely.

-- =============================================================================
-- stories
-- =============================================================================

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stories_select_public_or_owner ON public.stories;
CREATE POLICY stories_select_public_or_owner ON public.stories
  FOR SELECT
  USING (is_published OR auth.uid() = user_id);

DROP POLICY IF EXISTS stories_insert_owner ON public.stories;
CREATE POLICY stories_insert_owner ON public.stories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS stories_update_owner ON public.stories;
CREATE POLICY stories_update_owner ON public.stories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS stories_delete_owner ON public.stories;
CREATE POLICY stories_delete_owner ON public.stories
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- chunks
-- =============================================================================

ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chunks_select_public_or_owner ON public.chunks;
CREATE POLICY chunks_select_public_or_owner ON public.chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = chunks.story_id
        AND (s.is_published OR s.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS chunks_insert_owner ON public.chunks;
CREATE POLICY chunks_insert_owner ON public.chunks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = chunks.story_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chunks_update_owner ON public.chunks;
CREATE POLICY chunks_update_owner ON public.chunks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = chunks.story_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = chunks.story_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chunks_delete_owner ON public.chunks;
CREATE POLICY chunks_delete_owner ON public.chunks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = chunks.story_id AND s.user_id = auth.uid()
    )
  );

-- =============================================================================
-- panels
-- =============================================================================

ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS panels_select_public_or_owner ON public.panels;
CREATE POLICY panels_select_public_or_owner ON public.panels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = panels.story_id
        AND (s.is_published OR s.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS panels_insert_owner ON public.panels;
CREATE POLICY panels_insert_owner ON public.panels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = panels.story_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS panels_update_owner ON public.panels;
CREATE POLICY panels_update_owner ON public.panels
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = panels.story_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = panels.story_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS panels_delete_owner ON public.panels;
CREATE POLICY panels_delete_owner ON public.panels
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = panels.story_id AND s.user_id = auth.uid()
    )
  );

-- =============================================================================
-- layers
-- =============================================================================

ALTER TABLE public.layers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS layers_select_public_or_owner ON public.layers;
CREATE POLICY layers_select_public_or_owner ON public.layers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = layers.story_id
        AND (s.is_published OR s.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS layers_insert_owner ON public.layers;
CREATE POLICY layers_insert_owner ON public.layers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = layers.story_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS layers_update_owner ON public.layers;
CREATE POLICY layers_update_owner ON public.layers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = layers.story_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = layers.story_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS layers_delete_owner ON public.layers;
CREATE POLICY layers_delete_owner ON public.layers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = layers.story_id AND s.user_id = auth.uid()
    )
  );

-- =============================================================================
-- users
-- =============================================================================
-- The `users` row is created by a trigger on auth.users INSERT (outside the
-- scope of this migration). Clients may only read public columns and update
-- their own row.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_all ON public.users;
CREATE POLICY users_select_all ON public.users
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Intentionally no INSERT/DELETE policies: client-side inserts/deletes on
-- users are disallowed. The signup trigger runs as SECURITY DEFINER server-
-- side and is not subject to these RLS checks.

-- =============================================================================
-- Storage bucket: panels
-- =============================================================================
-- Upload paths: <story_id>/<panel_id>/<filename>. Owner is derived from the
-- first path segment (story_id) by joining against public.stories.

-- Ensure the bucket exists (idempotent). Public flag is true so published
-- stories' assets can be fetched without signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('panels', 'panels', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS panels_storage_select_public_or_owner ON storage.objects;
CREATE POLICY panels_storage_select_public_or_owner ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'panels'
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND (s.is_published OR s.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS panels_storage_insert_owner ON storage.objects;
CREATE POLICY panels_storage_insert_owner ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'panels'
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS panels_storage_update_owner ON storage.objects;
CREATE POLICY panels_storage_update_owner ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'panels'
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'panels'
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS panels_storage_delete_owner ON storage.objects;
CREATE POLICY panels_storage_delete_owner ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'panels'
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Verification queries (run manually after apply)
-- =============================================================================
-- 1. Confirm RLS is enabled:
--    SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname IN ('stories','panels','layers','chunks','users');
--
-- 2. From account B, attempt to mutate account A's story:
--    UPDATE public.stories SET title='hijacked' WHERE id='<A-owned-id>';
--    -> expected: 0 rows affected.
--
-- 3. As anon, SELECT an unpublished story:
--    SELECT * FROM public.stories WHERE id='<draft-id>';
--    -> expected: 0 rows.
