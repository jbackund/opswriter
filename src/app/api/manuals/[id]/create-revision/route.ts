import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const manualId = id

  // Get the manual with its current status
  const {
    data: manual,
    error: manualError,
  } = await supabase
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
    return NextResponse.json({ error: 'Manual not found' }, { status: 404 })
  }

  // Only allow creating new revision from approved manuals
  if (manual.status !== 'approved') {
    return NextResponse.json(
      { error: 'New revisions can only be created from approved manuals' },
      { status: 400 }
    )
  }

  // Check if user has permission (owner or sysadmin)
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

  // Check if there's already a draft revision for this manual
  const {
    data: existingDraft,
    error: draftCheckError,
  } = await supabase
    .from('revisions')
    .select('id, revision_number')
    .eq('manual_id', manualId)
    .eq('status', 'draft')
    .maybeSingle()

  if (existingDraft) {
    return NextResponse.json(
      {
        error: 'A draft revision already exists for this manual',
        existingRevision: existingDraft.revision_number
      },
      { status: 409 }
    )
  }

  // Get the current approved revision number and increment it
  const currentRevisionNumber = parseInt(manual.current_revision) || 0
  const newRevisionNumber = (currentRevisionNumber + 1).toString()

  // Create a snapshot of the current approved state
  const revisionSnapshot = {
    manual,
    timestamp: new Date().toISOString(),
  }

  // Start a transaction to create the new revision
  const { data: newRevision, error: revisionError } = await supabase
    .from('revisions')
    .insert({
      manual_id: manualId,
      revision_number: newRevisionNumber,
      status: 'draft',
      snapshot: revisionSnapshot,
      changes_summary: `New draft based on approved revision ${manual.current_revision}`,
      chapters_affected: [],
      created_by: user.id,
    })
    .select()
    .single()

  if (revisionError) {
    console.error('Error creating new revision:', revisionError)
    return NextResponse.json(
      { error: 'Failed to create new revision' },
      { status: 500 }
    )
  }

  // Update the manual status to draft
  const { error: updateError } = await supabase
    .from('manuals')
    .update({
      status: 'draft',
      current_revision: newRevisionNumber,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', manualId)

  if (updateError) {
    console.error('Error updating manual status:', updateError)
    // Try to rollback the revision creation
    await supabase
      .from('revisions')
      .delete()
      .eq('id', newRevision.id)

    return NextResponse.json(
      { error: 'Failed to update manual status' },
      { status: 500 }
    )
  }

  // Create audit log entry
  const { error: auditError } = await supabase
    .from('audit_logs')
    .insert({
      entity_type: 'manual',
      entity_id: manualId,
      action: 'create_revision',
      user_id: user.id,
      details: {
        manual_title: manual.title,
        from_revision: manual.current_revision,
        to_revision: newRevisionNumber,
        from_status: 'approved',
        to_status: 'draft',
      },
    })

  if (auditError) {
    console.error('Error creating audit log:', auditError)
    // Non-critical error, don't fail the operation
  }

  return NextResponse.json({
    success: true,
    newRevisionNumber,
    message: `Revision ${newRevisionNumber} created successfully. Manual is now editable.`
  })
}
