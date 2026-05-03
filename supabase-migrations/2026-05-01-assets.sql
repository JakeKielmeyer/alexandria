-- Create the assets table to centralize uploaded media management per story.
-- Enables reusing the same image/video/audio across multiple panels without
-- re-uploading. Each asset records the media_url, type, and filename.
-- Layers can reference assets via asset_id (FK) instead of storing media_url directly.

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
  media_url text NOT NULL,
  filename text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(story_id, filename)
);

-- Enable RLS so users can only access assets for stories they own.
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Policy: users can read assets for their own stories.
CREATE POLICY "Users can read own story assets"
  ON public.assets FOR SELECT
  USING (story_id IN (SELECT id FROM public.stories WHERE user_id = auth.uid()));

-- Policy: users can insert assets for their own stories.
CREATE POLICY "Users can create assets for own stories"
  ON public.assets FOR INSERT
  WITH CHECK (story_id IN (SELECT id FROM public.stories WHERE user_id = auth.uid()));

-- Policy: users can delete assets for their own stories.
CREATE POLICY "Users can delete assets for own stories"
  ON public.assets FOR DELETE
  USING (story_id IN (SELECT id FROM public.stories WHERE user_id = auth.uid()));

-- Add asset_id FK column to layers table. Nullable to preserve existing rows during backfill.
ALTER TABLE public.layers ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL;

-- Create an index on asset_id for fast lookups when rendering panels or listing assets.
CREATE INDEX IF NOT EXISTS idx_layers_asset_id ON public.layers(asset_id);

-- Create an index on story_id for fast filtering when listing assets per story.
CREATE INDEX IF NOT EXISTS idx_assets_story_id ON public.assets(story_id);
