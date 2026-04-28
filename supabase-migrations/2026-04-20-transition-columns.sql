-- Alexandria — add transition persistence columns.
-- Safe to re-run (uses IF NOT EXISTS).

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS transition_style text DEFAULT 'stacked';

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS transition_duration_ms integer DEFAULT 600;

-- Optional CHECK constraint (add manually if desired):
-- ALTER TABLE stories
--   ADD CONSTRAINT stories_transition_style_check
--   CHECK (transition_style IN ('stacked', 'fade', 'cut'));
