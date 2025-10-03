-- Migration: Increase allowable chapter depth and add clause numbering

ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS clause_number INTEGER;

ALTER TABLE chapters
  DROP CONSTRAINT IF EXISTS valid_depth;

ALTER TABLE chapters
  ADD CONSTRAINT valid_depth CHECK (depth >= 0 AND depth <= 3);

ALTER TABLE chapters
  DROP CONSTRAINT IF EXISTS valid_numbering;

ALTER TABLE chapters
  ADD CONSTRAINT valid_numbering CHECK (
    (depth = 0 AND section_number IS NULL AND subsection_number IS NULL AND clause_number IS NULL) OR
    (depth = 1 AND section_number IS NOT NULL AND subsection_number IS NULL AND clause_number IS NULL) OR
    (depth = 2 AND section_number IS NOT NULL AND subsection_number IS NOT NULL AND clause_number IS NULL) OR
    (depth = 3 AND section_number IS NOT NULL AND subsection_number IS NOT NULL AND clause_number IS NOT NULL)
  );

ALTER TABLE chapters
  DROP CONSTRAINT IF EXISTS unique_chapter_per_manual;

ALTER TABLE chapters
  ADD CONSTRAINT unique_chapter_per_manual UNIQUE (
    manual_id,
    chapter_number,
    section_number,
    subsection_number,
    clause_number
  );

DROP INDEX IF EXISTS idx_chapters_number;

CREATE INDEX idx_chapters_number ON chapters (
  manual_id,
  chapter_number,
  section_number,
  subsection_number,
  clause_number
);
