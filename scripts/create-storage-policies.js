const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createStoragePolicies() {
  try {
    console.log('Creating RLS policies for storage buckets...')

    // SQL to create RLS policies
    const policiesSQL = `
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
    `

    // Execute the SQL using the service role connection
    const { data, error } = await supabase.rpc('exec_sql', {
      query: policiesSQL
    }).catch(async (rpcError) => {
      // If RPC doesn't exist, try direct approach
      console.log('RPC method not available, attempting alternative approach...')

      // We'll need to use the Supabase management API or dashboard
      console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:')
      console.log('📍 Dashboard URL: https://supabase.com/dashboard/project/mjpmvthvroflooywoyss/sql/new')
      console.log('\n' + '='.repeat(60))
      console.log(policiesSQL)
      console.log('='.repeat(60) + '\n')

      return { error: 'Manual intervention required' }
    })

    if (error) {
      if (error === 'Manual intervention required') {
        console.log('✓ SQL commands have been printed above.')
        console.log('Please copy and execute them in your Supabase SQL Editor.')
        console.log('\nAlternatively, you can save the SQL to a file and run:')
        console.log('npx supabase db push')
      } else {
        console.error('Error creating policies:', error)
      }
    } else {
      console.log('✅ RLS policies created successfully!')
    }

  } catch (error) {
    console.error('Error:', error)

    // Save SQL to migration file
    const fs = require('fs')
    const path = require('path')
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251031_add_storage_policies.sql')

    const policiesSQL = `
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
`

    fs.writeFileSync(migrationPath, policiesSQL)
    console.log(`\n✓ Migration file saved to: ${migrationPath}`)
    console.log('\nYou can now run: npx supabase db push')
    console.log('Or manually execute the SQL in your Supabase dashboard.')
  }
}

createStoragePolicies()