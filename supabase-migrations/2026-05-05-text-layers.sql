-- Migration: text layer support
-- Adds typography columns to layers and extends media_type to allow 'text'.
-- All columns are nullable so existing rows are unaffected.

ALTER TABLE layers
  ADD COLUMN text_content   text,
  ADD COLUMN font_family    text,
  ADD COLUMN font_size      numeric,
  ADD COLUMN text_color     text,
  ADD COLUMN font_weight    text,
  ADD COLUMN text_align     text,
  ADD COLUMN line_height    numeric,
  ADD COLUMN letter_spacing numeric;

-- Extend the media_type CHECK constraint to include 'text'.
-- Drop the old constraint by its auto-generated name first (safe: we re-add immediately).
ALTER TABLE layers DROP CONSTRAINT IF EXISTS layers_media_type_check;
ALTER TABLE layers ADD CONSTRAINT layers_media_type_check
  CHECK (media_type IN ('image', 'gif', 'video', 'audio', 'text'));
