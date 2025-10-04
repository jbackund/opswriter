CREATE OR REPLACE FUNCTION public.get_next_revision_number(p_manual_id UUID, p_is_draft BOOLEAN DEFAULT true)
RETURNS TEXT AS $$
DECLARE
  highest_base INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE
        WHEN revision_number ~ '^[0-9]+$' THEN revision_number::INTEGER
        WHEN revision_number ~ '^[0-9]+\.[0-9]+$' THEN SPLIT_PART(revision_number, '.', 1)::INTEGER
        ELSE NULL
      END
    ),
    0
  )
  INTO highest_base
  FROM revisions
  WHERE manual_id = p_manual_id;

  IF p_is_draft THEN
    RETURN (highest_base + 1)::TEXT;
  END IF;

  RETURN highest_base::TEXT;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.get_next_revision_number(UUID, BOOLEAN) SET search_path = public;
