-- Add read_count to stories table.
-- Incremented each time a reader passes the interstitial gate.
-- Default 0, never null.

ALTER TABLE stories ADD COLUMN IF NOT EXISTS read_count integer NOT NULL DEFAULT 0;

-- Atomic increment function callable via supabase.rpc().
-- SECURITY DEFINER so anonymous readers can call it without needing
-- UPDATE permission on the stories row directly.
CREATE OR REPLACE FUNCTION increment_story_read_count(story_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE stories SET read_count = read_count + 1 WHERE id = story_id;
$$;
