-- Alexandria — add reading_direction to stories.
-- Safe to re-run (uses IF NOT EXISTS).

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS reading_direction text NOT NULL DEFAULT 'ltr'
  CHECK (reading_direction IN ('ltr', 'rtl'));
