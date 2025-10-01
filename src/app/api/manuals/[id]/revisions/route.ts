import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/manuals/[id]/revisions - List all revisions for a manual
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const manualId = params.id

    // Get all revisions for this manual, ordered by creation date
    const { data: revisions, error } = await supabase
      .from('revisions')
      .select(`
        *,
        created_by_user:user_profiles!revisions_created_by_fkey(full_name, email),
        approved_by_user:user_profiles!revisions_approved_by_fkey(full_name, email),
        rejected_by_user:user_profiles!revisions_rejected_by_fkey(full_name, email),
        submitted_by_user:user_profiles!revisions_submitted_by_fkey(full_name, email)
      `)
      .eq('manual_id', manualId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching revisions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch revisions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ revisions })
  } catch (error) {
    console.error('Error in revisions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/manuals/[id]/revisions - Create a new revision snapshot
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const manualId = params.id
    const body = await request.json()
    const { changes_summary, chapters_affected } = body

    // Get current manual state
    const { data: manual, error: manualError } = await supabase
      .from('manuals')
      .select(`
        *,
        chapters(
          *,
          content_blocks(*),
          chapter_remarks(*)
        )
      `)
      .eq('id', manualId)
      .single()

    if (manualError || !manual) {
      return NextResponse.json(
        { error: 'Manual not found' },
        { status: 404 }
      )
    }

    // Get next revision number
    const { data: revisionNumber, error: revisionError } = await supabase
      .rpc('get_next_revision_number', {
        p_manual_id: manualId,
        p_is_draft: true,
      })

    if (revisionError) {
      console.error('Error getting revision number:', revisionError)
      return NextResponse.json(
        { error: 'Failed to generate revision number' },
        { status: 500 }
      )
    }

    // Create snapshot
    const snapshot = {
      manual,
      timestamp: new Date().toISOString(),
    }

    // Insert new revision
    const { data: newRevision, error: insertError } = await supabase
      .from('revisions')
      .insert({
        manual_id: manualId,
        revision_number: revisionNumber,
        status: 'draft',
        snapshot,
        changes_summary,
        chapters_affected,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating revision:', insertError)
      return NextResponse.json(
        { error: 'Failed to create revision' },
        { status: 500 }
      )
    }

    return NextResponse.json({ revision: newRevision }, { status: 201 })
  } catch (error) {
    console.error('Error in create revision API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
