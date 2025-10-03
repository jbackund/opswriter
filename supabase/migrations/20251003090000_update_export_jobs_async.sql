-- Migration: 20251003090000_update_export_jobs_async.sql
-- Purpose: Update export_jobs table for async processing support

-- Add new columns for async job processing if they don't exist
ALTER TABLE export_jobs
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS download_url TEXT;

-- Update status enum to include 'processing' if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'processing'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'export_status'
    )
  ) THEN
    ALTER TYPE export_status ADD VALUE 'processing' AFTER 'pending';
  END IF;
END $$;

-- Create index for faster job status queries
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_generated_by ON export_jobs(generated_by);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON export_jobs(created_at DESC);

-- Add function to automatically clean up expired exports
CREATE OR REPLACE FUNCTION cleanup_expired_export_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete export jobs older than 30 days
  DELETE FROM export_jobs
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND status IN ('completed', 'failed');

  -- Delete associated files from storage
  -- This would need to be handled by a separate process or Edge Function
  -- as we can't directly delete from storage here
END;
$$;

-- Create a scheduled job to run cleanup daily (requires pg_cron extension)
-- Note: This needs to be set up manually in Supabase Dashboard if pg_cron is available
-- SELECT cron.schedule('cleanup-export-jobs', '0 2 * * *', 'SELECT cleanup_expired_export_jobs();');

-- Add comment
COMMENT ON TABLE export_jobs IS 'Tracks PDF export jobs for async processing and status monitoring';
COMMENT ON COLUMN export_jobs.started_at IS 'When the job started processing';
COMMENT ON COLUMN export_jobs.error_message IS 'Error details if job failed';
COMMENT ON COLUMN export_jobs.file_size_bytes IS 'Size of generated PDF in bytes';
COMMENT ON COLUMN export_jobs.download_url IS 'Signed URL for downloading the exported PDF';