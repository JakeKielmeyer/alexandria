-- Tail length (tip distance from attachment point, px).
-- Also expands tail_direction from 4 cardinal to 8 (cardinal + corner).

ALTER TABLE layers
  ADD COLUMN IF NOT EXISTS tail_length integer NOT NULL DEFAULT 40;

ALTER TABLE layers
  DROP CONSTRAINT IF EXISTS layers_tail_direction_check;

ALTER TABLE layers
  ADD CONSTRAINT layers_tail_direction_check
  CHECK (tail_direction IN (
    'top-left', 'top', 'top-right',
    'right',
    'bottom-right', 'bottom', 'bottom-left',
    'left'
  ));
