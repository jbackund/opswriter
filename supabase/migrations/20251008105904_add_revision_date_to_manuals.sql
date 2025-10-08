ALTER TABLE manuals
  ADD COLUMN IF NOT EXISTS revision_date DATE;

-- Backfill revision_date with effective_date if available and revision_date is null
UPDATE manuals
SET revision_date = effective_date
WHERE revision_date IS NULL
  AND effective_date IS NOT NULL;
