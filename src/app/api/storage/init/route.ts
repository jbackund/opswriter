import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  // Use service role key to create buckets
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Create the organization-logos bucket if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets()
    const existingBucket = buckets?.find(b => b.id === 'organization-logos')

    if (!existingBucket) {
      const { data, error } = await supabase.storage.createBucket('organization-logos', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'],
        fileSizeLimit: 5242880 // 5MB
      })

      if (error && !error.message?.includes('already exists')) {
        console.error('Error creating organization-logos bucket:', error)
      }
    }

    // Create the manual-content bucket if it doesn't exist
    const contentBucket = buckets?.find(b => b.id === 'manual-content')

    if (!contentBucket) {
      const { data, error } = await supabase.storage.createBucket('manual-content', {
        public: false,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'application/pdf'],
        fileSizeLimit: 10485760 // 10MB
      })

      if (error && !error.message?.includes('already exists')) {
        console.error('Error creating manual-content bucket:', error)
      }
    }

    return NextResponse.json({
      message: 'Storage buckets initialized successfully'
    })
  } catch (error: any) {
    console.error('Error initializing storage:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initialize storage' },
      { status: 500 }
    )
  }
}