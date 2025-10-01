-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view logos 1" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload logos 1" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update logos 1" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete logos 1" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view content 1" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload content 1" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update content 1" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete content 1" ON storage.objects;

-- Policies for organization-logos bucket (public read, authenticated write)
CREATE POLICY "Anyone can view logos 1" ON storage.objects
FOR SELECT USING (bucket_id = 'organization-logos');

CREATE POLICY "Authenticated can upload logos 1" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'organization-logos');

CREATE POLICY "Authenticated can update logos 1" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'organization-logos')
WITH CHECK (bucket_id = 'organization-logos');

CREATE POLICY "Authenticated can delete logos 1" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'organization-logos');

-- Policies for manual-content bucket (authenticated access only)
CREATE POLICY "Authenticated can view content 1" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'manual-content');

CREATE POLICY "Authenticated can upload content 1" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'manual-content');

CREATE POLICY "Authenticated can update content 1" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'manual-content')
WITH CHECK (bucket_id = 'manual-content');

CREATE POLICY "Authenticated can delete content 1" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'manual-content');