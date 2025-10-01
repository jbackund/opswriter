import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service role to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Delete the test manual (CASCADE will delete related chapters)
    const { error } = await supabase
      .from('manuals')
      .delete()
      .eq('manual_code', 'TEST-001')

    if (error) {
      console.error('Error deleting test manual:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test manual TEST-001 deleted successfully'
    })
  } catch (error: any) {
    console.error('Error in delete endpoint:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete manual' },
      { status: 500 }
    )
  }
}