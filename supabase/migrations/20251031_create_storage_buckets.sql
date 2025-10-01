-- Create storage bucket for manual logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('organization-logos', 'organization-logos', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage bucket for manual content images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('manual-content', 'manual-content', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for organization-logos bucket (public read, authenticated write)
CREATE POLICY "Public read access for manual logos" ON storage.objects
FOR SELECT USING (bucket_id = 'organization-logos');

CREATE POLICY "Authenticated users can upload manual logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'organization-logos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update manual logos" ON storage.objects
FOR UPDATE WITH CHECK (
  bucket_id = 'organization-logos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete manual logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'organization-logos'
  AND auth.role() = 'authenticated'
);

-- RLS Policies for manual-content bucket (authenticated access only)
CREATE POLICY "Authenticated users can read manual content" ON storage.objects
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