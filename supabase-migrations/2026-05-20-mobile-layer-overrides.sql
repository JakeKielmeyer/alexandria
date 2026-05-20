-- Alexandria — add mobile layer override columns.
-- Safe to re-run (uses IF NOT EXISTS).

ALTER TABLE layers
  ADD COLUMN IF NOT EXISTS mobile_hidden         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mobile_x_percent      real,
  ADD COLUMN IF NOT EXISTS mobile_y_percent      real,
  ADD COLUMN IF NOT EXISTS mobile_width_percent  real,
  ADD COLUMN IF NOT EXISTS mobile_height_percent real;
