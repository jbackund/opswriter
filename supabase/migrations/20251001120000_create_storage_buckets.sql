-- =====================================================
-- CREATE STORAGE BUCKETS AND POLICIES
-- Migration for manual attachments and organization logos
-- =====================================================

-- ==============================================================================
-- 1. MANUAL ATTACHMENTS BUCKET (Private)
-- ==============================================================================
-- Private bucket for manual attachments (PDFs, Word docs, Excel, images)
-- Max file size: 50MB
-- Access: Authenticated users can upload/view, only owners can update/delete

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manual-attachments',
  'manual-attachments',
  false, -- Private bucket
  52428800, -- 50MB in bytes (50 * 1024 * 1024)
  ARRAY[
    -- PDF files
    'application/pdf',
    -- Microsoft Word
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    -- Microsoft Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    -- Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]
);

-- Enable RLS on storage.objects table (should already be enabled, but ensuring)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to upload attachments
CREATE POLICY "Authenticated users can upload manual attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'manual-attachments' AND
  auth.uid() IS NOT NULL
);

-- RLS Policy: Allow authenticated users to view attachments
CREATE POLICY "Authenticated users can view manual attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'manual-attachments' AND
  auth.uid() IS NOT NULL
);

-- RLS Policy: Allow owners to update their own attachments
CREATE POLICY "Users can update their own manual attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'manual-attachments' AND
  (auth.uid())::text = owner_id
)
WITH CHECK (
  bucket_id = 'manual-attachments' AND
  (auth.uid())::text = owner_id
);

-- RLS Policy: Allow owners to delete their own attachments
CREATE POLICY "Users can delete their own manual attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'manual-attachments' AND
  (auth.uid())::text = owner_id
);

-- ==============================================================================
-- 2. ORGANIZATION LOGOS BUCKET (Public Read)
-- ==============================================================================
-- Public read bucket for organization logos
-- Max file size: 5MB
-- Access: Anyone can view, authenticated users can upload, only SysAdmins can update/delete

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true, -- Public bucket (read access)
  5242880, -- 5MB in bytes (5 * 1024 * 1024)
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]
);

-- RLS Policy: Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload organization logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos' AND
  auth.uid() IS NOT NULL
);

-- RLS Policy: Public read access to logos (bucket is public, but policy for explicit access)
CREATE POLICY "Anyone can view organization logos"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'organization-logos'
);

-- RLS Policy: Only SysAdmins can update logos
CREATE POLICY "SysAdmins can update organization logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'sysadmin'
  )
)
WITH CHECK (
  bucket_id = 'organization-logos' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'sysadmin'
  )
);

-- RLS Policy: Only SysAdmins can delete logos
CREATE POLICY "SysAdmins can delete organization logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'sysadmin'
  )
);

-- ==============================================================================
-- HELPER FUNCTIONS AND COMMENTS
-- ==============================================================================

COMMENT ON TABLE storage.buckets IS 'Storage buckets configuration for OpsWriter application';

-- Create helper function to get bucket info (optional, for debugging)
CREATE OR REPLACE FUNCTION storage.get_bucket_info(bucket_name text)
RETURNS TABLE (
  id text,
  name text,
  public boolean,
  file_size_limit_mb numeric,
  allowed_mime_types text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = storage
AS $$
  SELECT
    id,
    name,
    public,
    ROUND((file_size_limit / 1048576.0)::numeric, 2) as file_size_limit_mb,
    allowed_mime_types
  FROM storage.buckets
  WHERE name = bucket_name;
$$;

COMMENT ON FUNCTION storage.get_bucket_info IS 'Helper function to retrieve bucket configuration details with file size in MB';

-- Create helper function to check user storage quota (for future use)
CREATE OR REPLACE FUNCTION storage.get_user_storage_usage(user_uuid uuid)
RETURNS TABLE (
  total_files bigint,
  total_size_mb numeric,
  bucket_breakdown jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = storage
AS $$
  SELECT
    COUNT(*)::bigint as total_files,
    ROUND((SUM(COALESCE((metadata->>'size')::bigint, 0)) / 1048576.0)::numeric, 2) as total_size_mb,
    jsonb_object_agg(
      bucket_id,
      jsonb_build_object(
        'files', COUNT(*),
        'size_mb', ROUND((SUM(COALESCE((metadata->>'size')::bigint, 0)) / 1048576.0)::numeric, 2)
      )
    ) as bucket_breakdown
  FROM storage.objects
  WHERE owner_id = user_uuid::text
  GROUP BY owner_id;
$$;

COMMENT ON FUNCTION storage.get_user_storage_usage IS 'Calculate total storage usage per user across all buckets';