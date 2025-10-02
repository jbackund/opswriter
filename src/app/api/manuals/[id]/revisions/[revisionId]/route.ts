import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/manuals/[id]/revisions/[revisionId] - Get specific revision snapshot
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: manualId, revisionId } = await params

    // Get the specific revision with full details
    const { data: revision, error } = await supabase
      .from('revisions')
      .select(`
        *,
        created_by_user:user_profiles!revisions_created_by_fkey(full_name, email),
        approved_by_user:user_profiles!revisions_approved_by_fkey(full_name, email),
        rejected_by_user:user_profiles!revisions_rejected_by_fkey(full_name, email),
        submitted_by_user:user_profiles!revisions_submitted_by_fkey(full_name, email)
      `)
      .eq('id', revisionId)
      .eq('manual_id', manualId)
      .single()

    if (error || !revision) {
      return NextResponse.json(
        { error: 'Revision not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ revision })
  } catch (error) {
    console.error('Error in get revision API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
