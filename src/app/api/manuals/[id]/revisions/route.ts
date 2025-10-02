import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/manuals/[id]/revisions - List all revisions for a manual
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params
    const manualId = id

    // Get all revisions for this manual, ordered by creation date
    const { data: revisions, error } = await supabase
      .from('revisions')
      .select('*')
      .eq('manual_id', manualId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching revisions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch revisions' },
        { status: 500 }
      )
    }

    const revisionList = revisions ?? []

    const userIds = Array.from(
      new Set(
        revisionList.flatMap((revision) =>
          [
            revision.created_by,
            revision.approved_by,
            revision.rejected_by,
            revision.submitted_by,
          ].filter((id): id is string => Boolean(id))
        )
      )
    )

    let profilesMap: Record<string, { full_name: string; email: string }> = {}

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      if (profilesError) {
        console.error('Error fetching revision user profiles:', profilesError)
      } else if (profiles) {
        profilesMap = Object.fromEntries(
          profiles.map((profile) => [profile.id, profile])
        )
      }
    }

    const revisionsWithProfiles = revisionList.map((revision) => {
      const fallbackProfile = { full_name: 'Unknown', email: '' }

      return {
        ...revision,
        created_by_user: profilesMap[revision.created_by] ?? fallbackProfile,
        approved_by_user: revision.approved_by
          ? profilesMap[revision.approved_by] ?? fallbackProfile
          : undefined,
        rejected_by_user: revision.rejected_by
          ? profilesMap[revision.rejected_by] ?? fallbackProfile
          : undefined,
        submitted_by_user: revision.submitted_by
          ? profilesMap[revision.submitted_by] ?? fallbackProfile
          : undefined,
      }
    })

    return NextResponse.json({ revisions: revisionsWithProfiles })
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
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params
    const manualId = id
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
