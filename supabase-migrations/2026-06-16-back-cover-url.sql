-- Add optional back_cover_url to stories.
-- Referenced by FlipBookReader as page N+1 (hard back cover page).
-- NULL = no back cover; reader shows dark/paper fallback.
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS back_cover_url TEXT;
