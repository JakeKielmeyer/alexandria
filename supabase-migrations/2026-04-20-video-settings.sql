-- Video layer playback settings.
-- Lets creators control how videos behave in the reader without changing
-- the Panel row. Defaults are tuned for muted-autoplay (browser-policy safe).

ALTER TABLE layers ADD COLUMN IF NOT EXISTS autoplay boolean NOT NULL DEFAULT true;
ALTER TABLE layers ADD COLUMN IF NOT EXISTS loop boolean NOT NULL DEFAULT true;
ALTER TABLE layers ADD COLUMN IF NOT EXISTS muted boolean NOT NULL DEFAULT true;
ALTER TABLE layers ADD COLUMN IF NOT EXISTS playback_rate numeric NOT NULL DEFAULT 1.0;
