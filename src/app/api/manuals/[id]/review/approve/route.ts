import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ApproveBody {
  effectiveDate: string
  comments?: string
  revisionId?: string
}

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

  const body = (await request.json().catch(() => ({}))) as ApproveBody

  if (!body?.effectiveDate) {
    return NextResponse.json(
      { error: 'Effective date is required' },
      { status: 400 }
    )
  }

  const { id } = await params
  const manualId = id

  const {
    data: revision,
    error: revisionError,
  } = await supabase
    .from('revisions')
    .select('id, revision_number, manual_id, status')
    .eq('manual_id', manualId)
    .eq('status', 'in_review')
    .maybeSingle()

  if (revisionError || !revision) {
    return NextResponse.json({ error: 'No pending revision found' }, { status: 404 })
  }

  if (body.revisionId && body.revisionId !== revision.id) {
    return NextResponse.json({ error: 'Revision mismatch' }, { status: 409 })
  }

  const {
    data: manual,
    error: manualError,
  } = await supabase
    .from('manuals')
    .select('*')
    .eq('id', manualId)
    .single()

  if (manualError || !manual) {
    return NextResponse.json({ error: 'Manual not found' }, { status: 404 })
  }

  const revisionId = revision.id
  const currentRevisionNumber = revision.revision_number

  if (!revisionId || !currentRevisionNumber) {
    return NextResponse.json(
      { error: 'Active review revision missing' },
      { status: 400 }
    )
  }

  let approvedRevisionNumber = currentRevisionNumber

  if (!approvedRevisionNumber || approvedRevisionNumber.includes('.')) {
    const {
      data: normalizedRevisionNumber,
      error: normalizedRevisionError,
    } = await supabase.rpc('get_next_revision_number', {
      p_manual_id: manualId,
      p_is_draft: true,
    })

    if (normalizedRevisionError || !normalizedRevisionNumber) {
      console.error(
        'Error normalizing approved revision number',
        normalizedRevisionError
      )
      return NextResponse.json(
        { error: 'Failed to determine approved revision number' },
        { status: 500 }
      )
    }

    approvedRevisionNumber = normalizedRevisionNumber as string
  }

  const now = new Date().toISOString()

  const { error: revisionUpdateError } = await supabase
    .from('revisions')
    .update({
      status: 'approved',
      approved_at: now,
      approved_by: user.id,
      revision_number: approvedRevisionNumber,
      changes_summary: body.comments ?? 'Approved',
    })
    .eq('id', revisionId)

  if (revisionUpdateError) {
    console.error('Error updating revision approval', revisionUpdateError)
    return NextResponse.json(
      { error: 'Failed to approve revision' },
      { status: 500 }
    )
  }

  const { error: manualUpdateError } = await supabase
    .from('manuals')
    .update({
      status: 'approved',
      effective_date: body.effectiveDate,
      current_revision: approvedRevisionNumber,
      updated_at: now,
      updated_by: user.id,
    })
    .eq('id', manualId)

  if (manualUpdateError) {
    console.error('Error updating manual to approved', manualUpdateError)
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
      to_status: 'approved',
      manual_title: manual.title,
      revision_number: approvedRevisionNumber,
      effective_date: body.effectiveDate,
      approval_comments: body.comments,
    },
  })

  if (auditError) {
    console.error('Error writing approval audit log', auditError)
  }

  return NextResponse.json({ revisionId, revisionNumber: approvedRevisionNumber })
}
