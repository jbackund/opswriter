-- Migration: 20251003080000_fix_field_history_trigger.sql
-- Purpose: Fix field_history trigger to handle NULL auth.uid() during migrations

-- Fix the track_field_changes() function to handle NULL auth.uid()
CREATE OR REPLACE FUNCTION public.track_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  manual_id_val UUID;
  revision_id_val UUID;
  field_name_val TEXT;
  old_val JSONB;
  new_val JSONB;
  user_id UUID;
BEGIN
  -- Get the current user ID
  user_id := auth.uid();

  -- Skip field history tracking if there's no authenticated user
  -- This prevents errors during migrations and system operations
  IF user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine manual_id based on table
  IF TG_TABLE_NAME = 'manuals' THEN
    manual_id_val := NEW.id;
  ELSIF TG_TABLE_NAME = 'chapters' THEN
    manual_id_val := NEW.manual_id;
  ELSIF TG_TABLE_NAME = 'content_blocks' THEN
    SELECT c.manual_id INTO manual_id_val FROM chapters c WHERE c.id = NEW.chapter_id;
  END IF;

  -- Track changes for each modified field
  FOR field_name_val IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
    old_val := to_jsonb(OLD) -> field_name_val;
    new_val := to_jsonb(NEW) -> field_name_val;

    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO field_history (
        manual_id,
        table_name,
        record_id,
        field_name,
        old_value,
        new_value,
        change_type,
        changed_by
      ) VALUES (
        manual_id_val,
        TG_TABLE_NAME,
        NEW.id,
        field_name_val,
        old_val,
        new_val,
        'updated'::change_type,
        user_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Add comment explaining the behavior
COMMENT ON FUNCTION public.track_field_changes() IS 'Tracks field-level changes for audit purposes. Skips tracking when no authenticated user is present (e.g., during migrations).';