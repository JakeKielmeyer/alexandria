-- Add tip position columns for the interactive SVG speech bubble.
-- tip_x_percent and tip_y_percent store the tail tip as a percentage of the panel dimensions,
-- same coordinate system as x_percent/y_percent on the layer.
-- Nullable: null means legacy layer — use tail_direction/tail_offset_percent/tail_length model.
ALTER TABLE layers
  ADD COLUMN IF NOT EXISTS tip_x_percent real,
  ADD COLUMN IF NOT EXISTS tip_y_percent real;
