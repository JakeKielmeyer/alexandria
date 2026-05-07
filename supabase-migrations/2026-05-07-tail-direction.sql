-- Adjustable tail: adds direction (edge) and offset (position along edge) columns.
-- Run: Supabase SQL editor BEFORE deploying tail direction code changes.

ALTER TABLE layers
  ADD COLUMN IF NOT EXISTS tail_direction text NOT NULL DEFAULT 'bottom',
  ADD COLUMN IF NOT EXISTS tail_offset_percent real NOT NULL DEFAULT 50;

ALTER TABLE layers
  ADD CONSTRAINT layers_tail_direction_check
  CHECK (tail_direction IN ('top', 'right', 'bottom', 'left'));
