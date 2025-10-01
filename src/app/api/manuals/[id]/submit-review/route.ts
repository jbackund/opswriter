import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const manualId = params.id

  const {
    data: manual,
    error: manualError,
  } = await supabase
    .from('manuals')
    .select(
      `*,
       chapters(
         *,
         content_blocks(*),
         chapter_remarks(*)
       )
    `
    )
    .eq('id', manualId)
    .single()

  if (manualError || !manual) {
    return NextResponse.json({ error: 'Manual not found' }, { status: 404 })
  }

  if (manual.status !== 'draft' && manual.status !== 'rejected') {
    return NextResponse.json(
      { error: 'Manual is not editable' },
      { status: 400 }
    )
  }

  const {
    data: userProfile,
    error: profileError,
  } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
  }

  if (manual.created_by !== user.id && userProfile?.role !== 'sysadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const revisionSnapshot = {
    manual,
    timestamp: new Date().toISOString(),
  }

  const { data: revisionNumber, error: revisionNumberError } = await supabase
    .rpc('get_next_revision_number', {
      p_manual_id: manualId,
      p_is_draft: true,
    })

  if (revisionNumberError) {
    console.error('Error generating draft revision number', revisionNumberError)
    return NextResponse.json(
      { error: 'Failed to generate revision number' },
      { status: 500 }
    )
  }

  const { data: revision, error: revisionError } = await supabase
    .from('revisions')
    .insert({
      manual_id: manualId,
      revision_number: revisionNumber,
      status: 'in_review',
      snapshot: revisionSnapshot,
      changes_summary: 'Submitted for review',
      chapters_affected: manual.chapters?.map((ch: any) =>
        ch.chapter_number?.toString()
      ) ?? [],
      submitted_for_review_at: new Date().toISOString(),
      submitted_by: user.id,
      created_by: user.id,
    })
    .select()
    .single()

  if (revisionError) {
    console.error('Error creating in-review revision', revisionError)
    return NextResponse.json(
      { error: 'Failed to create revision snapshot' },
      { status: 500 }
    )
  }

  const { error: manualUpdateError } = await supabase
    .from('manuals')
    .update({
      status: 'in_review',
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', manualId)

  if (manualUpdateError) {
    console.error('Error updating manual status to in_review', manualUpdateError)
    return NextResponse.json(
      { error: 'Failed to update manual status' },
      { status: 500 }
    )
  }

  const { error: auditError } = await supabase.from('audit_logs').insert({
    entity_type: 'manual',
    entity_id: manualId,
    action: 'status_change',
    actor_id: user.id,
    metadata: {
      from_status: manual.status,
      to_status: 'in_review',
      manual_title: manual.title,
      revision_number: revisionNumber,
    },
  })

  if (auditError) {
    console.error('Error recording audit log for review submission', auditError)
  }

  return NextResponse.json({ revision }, { status: 200 })
}
