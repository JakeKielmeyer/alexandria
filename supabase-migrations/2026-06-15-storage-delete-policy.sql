-- Add missing DELETE policy to storage.objects for the panels bucket.
--
-- The panels bucket had INSERT and SELECT policies but no DELETE policy.
-- Without a DELETE policy, RLS silently blocks all remove() calls, leaving
-- orphaned files in storage whenever assets or panel layers are deleted.
--
-- Condition: the caller must own the story whose UUID is the first path
-- component of the stored object (e.g. {storyId}/assets/file.jpg).

CREATE POLICY "panels_storage_delete_owner" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'panels'
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id::text = (storage.foldername(objects.name))[1]
        AND s.user_id = auth.uid()
    )
  );
