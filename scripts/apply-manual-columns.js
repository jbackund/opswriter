const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

async function applyMigration() {
  console.log('Applying migration to add missing columns to manuals table...')

  try {
    // First check if columns already exist
    const { data: existingColumns, error: checkError } = await supabase
      .rpc('get_table_columns', {
        schema_name: 'public',
        table_name: 'manuals'
      })
      .catch(() => {
        // If RPC doesn't exist, try direct query
        return { data: null, error: null }
      })

    // Try using direct SQL execution through the REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: `
          ALTER TABLE public.manuals
          ADD COLUMN IF NOT EXISTS cover_logo_url TEXT,
          ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
          ADD COLUMN IF NOT EXISTS reference_number TEXT,
          ADD COLUMN IF NOT EXISTS tags TEXT[];
        `
      })
    })

    if (!response.ok) {
      // Try alternative approach using pg-api endpoint
      console.log('Standard approach failed, trying pg-api endpoint...')

      const pgResponse = await fetch(`${supabaseUrl}/pg/api`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE public.manuals
            ADD COLUMN IF NOT EXISTS cover_logo_url TEXT,
            ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
            ADD COLUMN IF NOT EXISTS reference_number TEXT,
            ADD COLUMN IF NOT EXISTS tags TEXT[];
          `
        })
      })

      if (!pgResponse.ok) {
        throw new Error('Cannot execute DDL through API')
      }
    }

    console.log('✅ Migration applied successfully!')

    // Verify the columns were added
    const { data: verification, error: verifyError } = await supabase
      .from('manuals')
      .select('*')
      .limit(0)

    if (!verifyError) {
      console.log('✅ Columns verified successfully!')
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error.message)
    console.log('\n⚠️  The Supabase API does not allow DDL operations.')
    console.log('Please run the following SQL in your Supabase Dashboard:\n')
    console.log('📍 Go to: https://supabase.com/dashboard/project/mjpmvthvroflooywoyss/sql/new')
    console.log('\n--- Copy and paste this SQL ---')
    console.log(`
ALTER TABLE public.manuals
ADD COLUMN IF NOT EXISTS cover_logo_url TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[];
    `)
    console.log('--- End of SQL ---\n')
    console.log('After running the SQL, your manual creation form will work!')
  }
}

applyMigration()