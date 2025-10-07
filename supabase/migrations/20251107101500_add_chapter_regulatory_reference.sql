-- Purpose: Track external regulatory references on chapters
-- Adds an optional text column so editors can cite regulations per chapter

ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS regulatory_reference TEXT;

COMMENT ON COLUMN chapters.regulatory_reference IS 'External regulatory citation or identifier associated with this chapter.';
