const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

async function applyRLSPolicies() {
  console.log('Applying RLS policies for storage buckets...')
  console.log('Supabase URL:', supabaseUrl)

  try {
    // Use fetch with service role key to execute SQL directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: `
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
        `
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to execute SQL:', error)
      console.log('\n⚠️  Direct SQL execution failed. Please run the SQL manually in your Supabase SQL Editor:')
      console.log('📍 Dashboard URL: https://supabase.com/dashboard/project/mjpmvthvroflooywoyss/sql/new')
      console.log('\n--- Copy the SQL below ---')
      console.log(`
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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
      `)
      console.log('--- End of SQL ---\n')
      return
    }

    console.log('✅ RLS policies applied successfully!')

  } catch (error) {
    console.error('Error:', error.message)
    console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:')
    console.log('📍 Dashboard URL: https://supabase.com/dashboard/project/mjpmvthvroflooywoyss/sql/new')
    console.log('\n--- Copy the SQL below ---')
    console.log(`
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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
    `)
    console.log('--- End of SQL ---\n')
  }
}

applyRLSPolicies()