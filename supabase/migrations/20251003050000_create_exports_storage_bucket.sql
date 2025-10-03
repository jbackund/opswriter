-- =====================================================
-- Create 'exports' storage bucket for PDF exports
-- =====================================================

-- Create the exports bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  false, -- Not public, requires authentication
  52428800, -- 50MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload PDFs to exports bucket
CREATE POLICY "Users can upload exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exports'
  AND auth.uid() IS NOT NULL
);

-- Policy: Users can view their own exports (based on path starting with their user ID)
CREATE POLICY "Users can view own exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: SysAdmins can view all exports
CREATE POLICY "SysAdmins can view all exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'sysadmin'
  )
);

-- Policy: Users can delete their own exports
CREATE POLICY "Users can delete own exports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: SysAdmins can delete any export (for retention cleanup)
CREATE POLICY "SysAdmins can delete exports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exports'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'sysadmin'
  )
);

-- Add comments
COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads';
