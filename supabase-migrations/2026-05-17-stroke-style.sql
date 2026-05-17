-- Speech bubble stroke style columns
-- stroke_color: null = design-system default (#DC5A8A)
-- has_stroke: false = no border rendered
-- stroke_width: null = default 1.5px
ALTER TABLE layers ADD COLUMN stroke_color text;
ALTER TABLE layers ADD COLUMN has_stroke boolean NOT NULL DEFAULT true;
ALTER TABLE layers ADD COLUMN stroke_width real;
