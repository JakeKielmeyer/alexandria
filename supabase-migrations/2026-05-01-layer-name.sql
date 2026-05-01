-- Adds an optional creator-facing name to each layer so the editor's Layers
-- tab can show a human label ("Hero image", "Ambient track") instead of just
-- the media type. Empty / null falls back to media_type at render time.

ALTER TABLE public.layers
  ADD COLUMN IF NOT EXISTS name text;
