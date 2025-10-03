-- Migration: 20251003070000_add_fulltext_search.sql
-- Purpose: Add full-text search capabilities for manuals, chapters, and content

-- Create search vector columns for full-text search
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE content_blocks ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE definitions ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE abbreviations ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update manual search vector
CREATE OR REPLACE FUNCTION update_manual_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.manual_code, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.reference_number, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update chapter search vector
CREATE OR REPLACE FUNCTION update_chapter_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.heading, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update content_block search vector
CREATE OR REPLACE FUNCTION update_content_block_search_vector()
RETURNS trigger AS $$
DECLARE
  text_content TEXT;
BEGIN
  -- Extract text from JSONB content
  text_content := CASE
    WHEN NEW.content ? 'html' THEN
      regexp_replace(NEW.content->>'html', '<[^>]*>', '', 'g')
    WHEN NEW.content ? 'text' THEN
      NEW.content->>'text'
    ELSE
      NEW.content::text
  END;

  NEW.search_vector := to_tsvector('english', COALESCE(text_content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update definition search vector
CREATE OR REPLACE FUNCTION update_definition_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.term, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.definition, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update abbreviation search vector
CREATE OR REPLACE FUNCTION update_abbreviation_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.abbreviation, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.full_text, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic search vector updates
DROP TRIGGER IF EXISTS manual_search_vector_trigger ON manuals;
CREATE TRIGGER manual_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, description, manual_code, reference_number, tags
ON manuals
FOR EACH ROW EXECUTE FUNCTION update_manual_search_vector();

DROP TRIGGER IF EXISTS chapter_search_vector_trigger ON chapters;
CREATE TRIGGER chapter_search_vector_trigger
BEFORE INSERT OR UPDATE OF heading
ON chapters
FOR EACH ROW EXECUTE FUNCTION update_chapter_search_vector();

DROP TRIGGER IF EXISTS content_block_search_vector_trigger ON content_blocks;
CREATE TRIGGER content_block_search_vector_trigger
BEFORE INSERT OR UPDATE OF content
ON content_blocks
FOR EACH ROW EXECUTE FUNCTION update_content_block_search_vector();

DROP TRIGGER IF EXISTS definition_search_vector_trigger ON definitions;
CREATE TRIGGER definition_search_vector_trigger
BEFORE INSERT OR UPDATE OF term, definition
ON definitions
FOR EACH ROW EXECUTE FUNCTION update_definition_search_vector();

DROP TRIGGER IF EXISTS abbreviation_search_vector_trigger ON abbreviations;
CREATE TRIGGER abbreviation_search_vector_trigger
BEFORE INSERT OR UPDATE OF abbreviation, full_text
ON abbreviations
FOR EACH ROW EXECUTE FUNCTION update_abbreviation_search_vector();

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS idx_manuals_search_vector ON manuals USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_chapters_search_vector ON chapters USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_content_blocks_search_vector ON content_blocks USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_definitions_search_vector ON definitions USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_abbreviations_search_vector ON abbreviations USING gin(search_vector);

-- Update existing rows to populate search vectors
UPDATE manuals SET search_vector = search_vector WHERE true;
UPDATE chapters SET search_vector = search_vector WHERE true;
UPDATE content_blocks SET search_vector = search_vector WHERE true;
UPDATE definitions SET search_vector = search_vector WHERE true;
UPDATE abbreviations SET search_vector = search_vector WHERE true;

-- Create a function for unified search across all tables
CREATE OR REPLACE FUNCTION search_all_content(search_query TEXT, result_limit INT DEFAULT 50)
RETURNS TABLE (
  type TEXT,
  id UUID,
  title TEXT,
  content TEXT,
  manual_id UUID,
  manual_title TEXT,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query_tsquery tsquery;
BEGIN
  query_tsquery := plainto_tsquery('english', search_query);

  RETURN QUERY
  WITH search_results AS (
    -- Search manuals
    SELECT
      'manual'::TEXT as type,
      m.id,
      m.title,
      m.description as content,
      m.id as manual_id,
      m.title as manual_title,
      ts_rank(m.search_vector, query_tsquery) as rank
    FROM manuals m
    WHERE m.search_vector @@ query_tsquery

    UNION ALL

    -- Search chapters
    SELECT
      'chapter'::TEXT as type,
      c.id,
      c.heading as title,
      c.heading as content,
      c.manual_id,
      m.title as manual_title,
      ts_rank(c.search_vector, query_tsquery) as rank
    FROM chapters c
    JOIN manuals m ON m.id = c.manual_id
    WHERE c.search_vector @@ query_tsquery

    UNION ALL

    -- Search content blocks
    SELECT
      'content'::TEXT as type,
      cb.id,
      ch.heading as title,
      CASE
        WHEN cb.content ? 'html' THEN
          substring(regexp_replace(cb.content->>'html', '<[^>]*>', '', 'g'), 1, 200) || '...'
        WHEN cb.content ? 'text' THEN
          substring(cb.content->>'text', 1, 200) || '...'
        ELSE
          substring(cb.content::text, 1, 200) || '...'
      END as content,
      ch.manual_id,
      m.title as manual_title,
      ts_rank(cb.search_vector, query_tsquery) as rank
    FROM content_blocks cb
    JOIN chapters ch ON ch.id = cb.chapter_id
    JOIN manuals m ON m.id = ch.manual_id
    WHERE cb.search_vector @@ query_tsquery

    UNION ALL

    -- Search definitions
    SELECT
      'definition'::TEXT as type,
      d.id,
      d.term as title,
      d.definition as content,
      NULL::UUID as manual_id,
      'Definitions' as manual_title,
      ts_rank(d.search_vector, query_tsquery) as rank
    FROM definitions d
    WHERE d.search_vector @@ query_tsquery

    UNION ALL

    -- Search abbreviations
    SELECT
      'abbreviation'::TEXT as type,
      a.id,
      a.abbreviation as title,
      a.full_text as content,
      NULL::UUID as manual_id,
      'Abbreviations' as manual_title,
      ts_rank(a.search_vector, query_tsquery) as rank
    FROM abbreviations a
    WHERE a.search_vector @@ query_tsquery
  )
  SELECT *
  FROM search_results
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_all_content(TEXT, INT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION search_all_content IS 'Performs full-text search across manuals, chapters, content, definitions, and abbreviations';