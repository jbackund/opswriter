const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createBuckets() {
  try {
    console.log('Creating storage buckets...')

    // Check existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    if (listError) {
      console.error('Error listing buckets:', listError)
      return
    }

    console.log('Existing buckets:', buckets?.map(b => b.id) || [])

    // Create organization-logos bucket
    const orgLogosExists = buckets?.some(b => b.id === 'organization-logos')
    if (!orgLogosExists) {
      console.log('Creating organization-logos bucket...')
      const { data, error } = await supabase.storage.createBucket('organization-logos', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'],
        fileSizeLimit: 5242880 // 5MB
      })

      if (error) {
        console.error('Error creating organization-logos bucket:', error)
      } else {
        console.log('✅ Created organization-logos bucket')
      }
    } else {
      console.log('✓ organization-logos bucket already exists')
    }

    // Create manual-content bucket
    const manualContentExists = buckets?.some(b => b.id === 'manual-content')
    if (!manualContentExists) {
      console.log('Creating manual-content bucket...')
      const { data, error } = await supabase.storage.createBucket('manual-content', {
        public: false,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'application/pdf'],
        fileSizeLimit: 10485760 // 10MB
      })

      if (error) {
        console.error('Error creating manual-content bucket:', error)
      } else {
        console.log('✅ Created manual-content bucket')
      }
    } else {
      console.log('✓ manual-content bucket already exists')
    }

    console.log('Storage bucket setup complete!')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

createBuckets()