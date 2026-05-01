-- Adds panel_span_count to layers so an audio layer can be configured to
-- play (and loop) across N consecutive panels rather than only its own panel.
-- Default 1 keeps existing behaviour for every other media type.

ALTER TABLE public.layers
  ADD COLUMN IF NOT EXISTS panel_span_count integer NOT NULL DEFAULT 1;
