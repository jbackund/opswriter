-- Add missing content column for chapters so the editor can persist rich text
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS content TEXT;

COMMENT ON COLUMN chapters.content IS 'Chapter content storage. Maintains compatibility with existing ManualEditor implementation.';
