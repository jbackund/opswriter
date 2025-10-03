-- Migration: 20251003060000_migrate_content_to_content_blocks.sql
-- Purpose: Move content from chapters.content to content_blocks table

-- Step 1: Migrate existing HTML content to content_blocks
INSERT INTO content_blocks (
  chapter_id,
  block_type,
  content,
  display_order,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  c.id as chapter_id,
  'text' as block_type,
  jsonb_build_object(
    'type', 'html',
    'html', c.content
  ) as content,
  0 as display_order,
  c.created_by,
  c.updated_by,
  c.created_at,
  c.updated_at
FROM chapters c
WHERE c.content IS NOT NULL
  AND length(c.content) > 0
  AND NOT EXISTS (
    SELECT 1 FROM content_blocks cb WHERE cb.chapter_id = c.id
  );

-- Step 2: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_content_blocks_chapter_id ON content_blocks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_display_order ON content_blocks(chapter_id, display_order);

-- Step 3: Mark old column as deprecated
COMMENT ON COLUMN chapters.content IS 'DEPRECATED: Content now stored in content_blocks table. Maintained for rollback only.';

-- Step 4: Verification query
DO $$
DECLARE
  chapters_with_content INTEGER;
  content_blocks_created INTEGER;
BEGIN
  SELECT COUNT(*) INTO chapters_with_content
  FROM chapters WHERE content IS NOT NULL AND length(content) > 0;

  SELECT COUNT(DISTINCT chapter_id) INTO content_blocks_created
  FROM content_blocks;

  RAISE NOTICE 'Migration complete: % chapters had content, % content blocks exist',
    chapters_with_content, content_blocks_created;
END $$;