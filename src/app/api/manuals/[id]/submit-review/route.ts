import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendReviewRequestEmail } from '@/lib/email/service'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const manualId = id

    const { data: manual, error: manualError } = await supabase
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
      return NextResponse.json({ error: 'Manual is not editable' }, { status: 400 })
    }

    const { data: userProfile, error: profileError } = await supabase
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

    const submittedAt = new Date().toISOString()
    const chaptersAffected =
      manual.chapters?.map((ch: any) => {
        const parts = [ch.chapter_number]
        if (ch.section_number !== null && ch.section_number !== undefined)
          parts.push(ch.section_number)
        if (ch.subsection_number !== null && ch.subsection_number !== undefined)
          parts.push(ch.subsection_number)
        if (ch.clause_number !== null && ch.clause_number !== undefined)
          parts.push(ch.clause_number)
        return parts.join('.')
      }) ?? []

    const { data: latestDraft } = await supabase
      .from('revisions')
      .select('*')
      .eq('manual_id', manualId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let revisionNumber: string
    let revision

    if (latestDraft) {
      revisionNumber = latestDraft.revision_number

      const { data: updatedRevision, error: revisionUpdateError } = await supabase
        .from('revisions')
        .update({
          status: 'in_review',
          snapshot: revisionSnapshot,
          changes_summary: 'Submitted for review',
          chapters_affected: chaptersAffected,
          submitted_for_review_at: submittedAt,
          submitted_by: user.id,
        })
        .eq('id', latestDraft.id)
        .select()
        .single()

      if (revisionUpdateError) {
        console.error('Error promoting draft revision to in_review', revisionUpdateError)
        return NextResponse.json(
          {
            error: 'Failed to update draft revision',
            details: revisionUpdateError.message,
            hint: (revisionUpdateError as any)?.details,
            code: revisionUpdateError.code,
          },
          { status: 500 }
        )
      }

      revision = updatedRevision
    } else {
      const { data: nextRevisionNumber, error: revisionNumberError } = await supabase.rpc(
        'get_next_revision_number',
        {
          p_manual_id: manualId,
          p_is_draft: true,
        }
      )

      if (revisionNumberError || !nextRevisionNumber) {
        console.error('Error generating draft revision number', revisionNumberError)
        return NextResponse.json(
          {
            error: 'Failed to generate revision number',
            details: revisionNumberError?.message,
            hint: revisionNumberError?.details,
          },
          { status: 500 }
        )
      }

      revisionNumber = nextRevisionNumber as string

      const { data: newRevision, error: revisionInsertError } = await supabase
        .from('revisions')
        .insert({
          manual_id: manualId,
          revision_number: revisionNumber,
          status: 'in_review',
          snapshot: revisionSnapshot,
          changes_summary: 'Submitted for review',
          chapters_affected: chaptersAffected,
          submitted_for_review_at: submittedAt,
          submitted_by: user.id,
          created_by: user.id,
        })
        .select()
        .single()

      if (revisionInsertError) {
        console.error('Error creating in-review revision', revisionInsertError)
        return NextResponse.json(
          {
            error: 'Failed to create revision snapshot',
            details: revisionInsertError.message,
            hint: (revisionInsertError as any)?.details,
            code: revisionInsertError.code,
          },
          { status: 500 }
        )
      }

      revision = newRevision
    }

    const { error: manualUpdateError } = await supabase
      .from('manuals')
      .update({
        status: 'in_review',
        updated_at: submittedAt,
        updated_by: user.id,
      })
      .eq('id', manualId)

    if (manualUpdateError) {
      console.error('Error updating manual status to in_review', manualUpdateError)
      return NextResponse.json(
        {
          error: 'Failed to update manual status',
          details: manualUpdateError.message,
          hint: (manualUpdateError as any)?.details,
          code: manualUpdateError.code,
        },
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

    // Send review request notification to SysAdmins
    try {
      // Get all SysAdmin users to notify them about the review request
      const { data: sysAdmins } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('role', 'sysadmin')

      if (sysAdmins && sysAdmins.length > 0) {
        // Get submitter's name
        const { data: submitterProfile } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()

        const submitterName = submitterProfile?.full_name || submitterProfile?.email || 'User'

        // Send email to each SysAdmin
        for (const admin of sysAdmins) {
          await sendReviewRequestEmail(
            { to: admin.email },
            {
              manualTitle: manual.title,
              manualRevision: revisionNumber,
              manualUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/manuals/${manualId}/review`,
              recipientName: admin.full_name || 'Reviewer',
              senderName: submitterName,
              comment: 'A new manual revision has been submitted for your review.',
            }
          )
        }
      }
    } catch (notificationError) {
      // Log error but don't fail the request
      console.error('Failed to send review notification:', notificationError)
    }

    return NextResponse.json({ revision }, { status: 200 })
  } catch (error: any) {
    console.error('Unhandled error submitting manual for review:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message,
      },
      { status: 500 }
    )
  }
}
