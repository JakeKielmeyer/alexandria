-- Tighten the panels storage SELECT policy to owner-only.
--
-- The 'panels' bucket is public=true, so individual files are accessible by
-- direct URL without any storage.objects RLS check. The SELECT policy only
-- controls .list() calls. Restricting it to the story owner prevents anon
-- clients and other authenticated users from enumerating file paths.

DROP POLICY IF EXISTS panels_storage_select_public_or_owner ON storage.objects;

CREATE POLICY panels_storage_select_owner ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'panels'
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.user_id = auth.uid()
    )
  );
