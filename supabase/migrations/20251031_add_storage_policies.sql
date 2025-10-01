
-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public can view organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view manual content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload manual content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update manual content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete manual content" ON storage.objects;

-- RLS Policies for organization-logos bucket (public read, authenticated write)
CREATE POLICY "Public can view organization logos" ON storage.objects
FOR SELECT USING (bucket_id = 'organization-logos');

CREATE POLICY "Authenticated users can upload organization logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'organization-logos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update organization logos" ON storage.objects
FOR UPDATE WITH CHECK (
  bucket_id = 'organization-logos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete organization logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'organization-logos'
  AND auth.role() = 'authenticated'
);

-- RLS Policies for manual-content bucket (authenticated access only)
CREATE POLICY "Authenticated users can view manual content" ON storage.objects
FOR SELECT USING (
  bucket_id = 'manual-content'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can upload manual content" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'manual-content'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update manual content" ON storage.objects
FOR UPDATE WITH CHECK (
  bucket_id = 'manual-content'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete manual content" ON storage.objects
FOR DELETE USING (
  bucket_id = 'manual-content'
  AND auth.role() = 'authenticated'
);
