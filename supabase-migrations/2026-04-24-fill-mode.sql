-- Fill mode: replaces the boolean is_fill with a three-way enum.
-- Safe to re-run (uses IF NOT EXISTS / WHERE clause).

ALTER TABLE layers ADD COLUMN IF NOT EXISTS fill_mode text;
ALTER TABLE layers ADD COLUMN IF NOT EXISTS focal_x_percent numeric NOT NULL DEFAULT 50;
ALTER TABLE layers ADD COLUMN IF NOT EXISTS focal_y_percent numeric NOT NULL DEFAULT 50;

-- Back-fill existing rows from is_fill.
UPDATE layers SET fill_mode = 'crop'   WHERE fill_mode IS NULL AND is_fill = true;
UPDATE layers SET fill_mode = 'custom' WHERE fill_mode IS NULL AND is_fill = false;
