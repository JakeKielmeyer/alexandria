-- Two fixes for the assets management modal:
--
-- 1. RLS UPDATE policy was missing — renaming an asset filename returned no
--    error but actually wrote zero rows. Add the missing UPDATE policy.
-- 2. Change layers.asset_id ON DELETE behaviour from SET NULL to CASCADE so
--    deleting an asset also removes every layer that referenced it. Without
--    this, deleted assets left orphaned layers on panels.

-- Allow story creators to UPDATE their own assets (rename, etc.)
CREATE POLICY "Users can update assets for own stories"
  ON public.assets FOR UPDATE
  USING (story_id IN (SELECT id FROM public.stories WHERE user_id = auth.uid()))
  WITH CHECK (story_id IN (SELECT id FROM public.stories WHERE user_id = auth.uid()));

-- Switch the FK from SET NULL → CASCADE.
-- Drop the existing constraint (Supabase auto-named it layers_asset_id_fkey)
-- and recreate it with ON DELETE CASCADE.
ALTER TABLE public.layers DROP CONSTRAINT IF EXISTS layers_asset_id_fkey;
ALTER TABLE public.layers
  ADD CONSTRAINT layers_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;
