-- Text layer type system: adds type, background, tail toggle, corner radius columns.
-- Run: Supabase SQL editor
-- Status: APPLIED 2026-05-07

ALTER TABLE layers
  ADD COLUMN IF NOT EXISTS text_layer_type text,
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS has_tail boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS border_radius integer;

ALTER TABLE layers
  ADD CONSTRAINT layers_text_layer_type_check
  CHECK (text_layer_type IS NULL OR text_layer_type IN
    ('dialogue', 'narrative', 'caption', 'sound_fx', 'plain'));
