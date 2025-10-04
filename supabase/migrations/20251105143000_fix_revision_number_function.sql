CREATE OR REPLACE FUNCTION public.get_next_revision_number(p_manual_id UUID, p_is_draft BOOLEAN DEFAULT true)
RETURNS TEXT AS $$
DECLARE
  current_rev TEXT;
  base_rev INTEGER;
  last_decimal INTEGER;
BEGIN
  -- Get latest approved revision number for the manual
  SELECT revision_number INTO current_rev
  FROM revisions
  WHERE manual_id = p_manual_id AND status = 'approved'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no approved revision exists yet, start with 0-series
  IF current_rev IS NULL THEN
    IF p_is_draft THEN
      RETURN '0.1';
    ELSE
      RETURN '0';
    END IF;
  END IF;

  base_rev := CAST(SPLIT_PART(current_rev, '.', 1) AS INTEGER);

  IF p_is_draft THEN
    -- Find the highest drafted/reviewed/rejected decimal revision for this base
    SELECT COALESCE(MAX(CAST(SPLIT_PART(revision_number, '.', 2) AS INTEGER)), 0)
    INTO last_decimal
    FROM revisions
    WHERE manual_id = p_manual_id
      AND revision_number LIKE base_rev::TEXT || '.%'
      AND status IN ('draft', 'in_review', 'rejected');

    RETURN base_rev::TEXT || '.' || (last_decimal + 1)::TEXT;
  ELSE
    -- Next approved revision increments the base revision
    RETURN (base_rev + 1)::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.get_next_revision_number(UUID, BOOLEAN) SET search_path = public;
