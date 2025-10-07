-- Add manual_id column to audit_logs for easier scoping
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS manual_id UUID;

CREATE INDEX IF NOT EXISTS idx_audit_logs_manual ON audit_logs(manual_id);

-- Temporarily drop the no_update rule to allow backfilling
DROP RULE IF EXISTS audit_logs_no_update ON audit_logs;

-- Backfill existing rows with manual_id where possible
-- From manuals table (NEW data)
UPDATE audit_logs
SET manual_id = (metadata->'new'->>'id')::uuid
WHERE manual_id IS NULL
  AND entity_type = 'manuals'
  AND metadata ? 'new'
  AND (metadata->'new'->>'id') IS NOT NULL;

-- From manuals table (OLD data)
UPDATE audit_logs
SET manual_id = (metadata->'old'->>'id')::uuid
WHERE manual_id IS NULL
  AND entity_type = 'manuals'
  AND metadata ? 'old'
  AND (metadata->'old'->>'id') IS NOT NULL;

-- From chapters table (NEW data)
UPDATE audit_logs
SET manual_id = (metadata->'new'->>'manual_id')::uuid
WHERE manual_id IS NULL
  AND entity_type = 'chapters'
  AND metadata ? 'new'
  AND (metadata->'new'->>'manual_id') IS NOT NULL;

-- From chapters table (OLD data)
UPDATE audit_logs
SET manual_id = (metadata->'old'->>'manual_id')::uuid
WHERE manual_id IS NULL
  AND entity_type = 'chapters'
  AND metadata ? 'old'
  AND (metadata->'old'->>'manual_id') IS NOT NULL;

-- From content_blocks and chapter_remarks via chapters lookup
UPDATE audit_logs al
SET manual_id = c.manual_id
FROM chapters c
WHERE al.manual_id IS NULL
  AND al.entity_type IN ('content_blocks', 'chapter_remarks')
  AND (
    (al.metadata ? 'new' AND (al.metadata->'new'->>'chapter_id')::uuid = c.id) OR
    (al.metadata ? 'old' AND (al.metadata->'old'->>'chapter_id')::uuid = c.id)
  );

-- From revisions table (NEW data)
UPDATE audit_logs
SET manual_id = (metadata->'new'->>'manual_id')::uuid
WHERE manual_id IS NULL
  AND entity_type = 'revisions'
  AND metadata ? 'new'
  AND (metadata->'new'->>'manual_id') IS NOT NULL;

-- From revisions table (OLD data)
UPDATE audit_logs
SET manual_id = (metadata->'old'->>'manual_id')::uuid
WHERE manual_id IS NULL
  AND entity_type = 'revisions'
  AND metadata ? 'old'
  AND (metadata->'old'->>'manual_id') IS NOT NULL;

-- Recreate the no_update rule to maintain immutability
CREATE RULE audit_logs_no_update AS
  ON UPDATE TO audit_logs DO INSTEAD NOTHING;

-- Recreate audit trigger function to populate manual_id moving forward
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  manual_ref UUID;
  related_chapter UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  END IF;

  IF TG_TABLE_NAME = 'manuals' THEN
    manual_ref := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'chapters' THEN
    manual_ref := COALESCE(NEW.manual_id, OLD.manual_id);
  ELSIF TG_TABLE_NAME = 'content_blocks' THEN
    related_chapter := COALESCE(NEW.chapter_id, OLD.chapter_id);
    IF related_chapter IS NOT NULL THEN
      SELECT manual_id INTO manual_ref FROM chapters WHERE id = related_chapter;
    END IF;
  ELSIF TG_TABLE_NAME = 'chapter_remarks' THEN
    related_chapter := COALESCE(NEW.chapter_id, OLD.chapter_id);
    IF related_chapter IS NOT NULL THEN
      SELECT manual_id INTO manual_ref FROM chapters WHERE id = related_chapter;
    END IF;
  ELSIF TG_TABLE_NAME = 'revisions' THEN
    manual_ref := COALESCE(NEW.manual_id, OLD.manual_id);
  END IF;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, manual_id, metadata)
  VALUES (
    auth.uid(),
    action_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    manual_ref,
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
