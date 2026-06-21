-- Alexandria — add 'all-audiences' to content_rating check constraint.
-- Drops the existing two-value constraint and replaces it with one
-- that also permits 'all-audiences' (no reader permission gates).

ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS stories_content_rating_check;

ALTER TABLE public.stories
  ADD CONSTRAINT stories_content_rating_check
  CHECK (content_rating IN ('all-audiences', 'mature', 'explicit'));
