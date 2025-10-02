import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RejectBody {
  reason: string
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

  const body = (await request.json().catch(() => ({}))) as RejectBody

  if (!body?.reason) {
    return NextResponse.json(
      { error: 'Rejection reason is required' },
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

  const now = new Date().toISOString()

  const { error: revisionUpdateError } = await supabase
    .from('revisions')
    .update({
      status: 'rejected',
      rejected_at: now,
      rejected_by: user.id,
      rejection_reason: body.reason,
    })
    .eq('id', revisionId)

  if (revisionUpdateError) {
    console.error('Error updating revision rejection', revisionUpdateError)
    return NextResponse.json(
      { error: 'Failed to reject revision' },
      { status: 500 }
    )
  }

  const { data: lastApproved, error: lastApprovedError } = await supabase
    .from('revisions')
    .select('revision_number')
    .eq('manual_id', manualId)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(1)
    .single()

  if (lastApprovedError && lastApprovedError.code !== 'PGRST116') {
    console.error('Error fetching last approved revision', lastApprovedError)
    return NextResponse.json(
      { error: 'Failed to determine last approved revision' },
      { status: 500 }
    )
  }

  const fallbackRevision = lastApproved ? lastApproved.revision_number : manual.current_revision

  const { error: manualUpdateError } = await supabase
    .from('manuals')
    .update({
      status: 'rejected',
      current_revision: fallbackRevision,
      updated_at: now,
      updated_by: user.id,
    })
    .eq('id', manualId)

  if (manualUpdateError) {
    console.error('Error updating manual after rejection', manualUpdateError)
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
      to_status: 'rejected',
      manual_title: manual.title,
      rejection_reason: body.reason,
    },
  })

  if (auditError) {
    console.error('Error writing rejection audit log', auditError)
  }

  return NextResponse.json({ revisionId })
}
