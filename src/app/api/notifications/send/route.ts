/**
 * API route for sending email notifications
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendReviewRequestEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendAssignmentEmail,
} from '@/lib/email/service'
import type { EmailOptions, EmailData } from '@/lib/email/service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, recipients, data } = body

    // Validate request
    if (!type || !recipients || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, recipients, and data' },
        { status: 400 }
      )
    }

    // Get recipient details from database
    const { data: recipientUsers, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .in('id', Array.isArray(recipients) ? recipients : [recipients])

    if (userError) {
      console.error('Failed to fetch recipient users:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch recipient information' },
        { status: 500 }
      )
    }

    if (!recipientUsers || recipientUsers.length === 0) {
      return NextResponse.json(
        { error: 'No valid recipients found' },
        { status: 400 }
      )
    }

    // Get sender details
    const { data: senderProfile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Prepare email options
    const emailOptions: EmailOptions = {
      to: recipientUsers.map(u => u.email),
    }

    // Prepare email data
    const emailData: EmailData = {
      ...data,
      senderName: senderProfile?.full_name || user.email?.split('@')[0] || 'System',
      recipientName: recipientUsers.length === 1
        ? recipientUsers[0].full_name || 'Team Member'
        : 'Team',
    }

    // Send appropriate email based on type
    let result
    switch (type) {
      case 'review_request':
        result = await sendReviewRequestEmail(emailOptions, emailData)
        break
      case 'approval':
        result = await sendApprovalEmail(emailOptions, emailData)
        break
      case 'rejection':
        result = await sendRejectionEmail(emailOptions, emailData)
        break
      case 'assignment':
        result = await sendAssignmentEmail(emailOptions, emailData)
        break
      default:
        return NextResponse.json(
          { error: `Invalid notification type: ${type}` },
          { status: 400 }
        )
    }

    // Log notification to audit trail
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      user_id: user.id,
      action: 'notification_sent',
      entity_type: 'email',
      entity_id: data.manualId ?? null,
      metadata: {
        type,
        recipients: recipientUsers.map(u => u.email),
        manual_title: data.manualTitle,
        success: result.success,
      },
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      data: result.data,
    })
  } catch (error) {
    console.error('Notification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
