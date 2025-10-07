-- Purpose: Allow chapters to store multiple regulatory references
-- Converts the regulatory_reference column to a text array while preserving existing data

ALTER TABLE chapters
  ALTER COLUMN regulatory_reference TYPE TEXT[]
  USING CASE
    WHEN regulatory_reference IS NULL THEN NULL
    ELSE ARRAY[regulatory_reference]
  END;

COMMENT ON COLUMN chapters.regulatory_reference IS 'External regulatory citations associated with this chapter.';
