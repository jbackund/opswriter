/**
 * Email service using Resend for transactional emails
 */
import { Resend } from 'resend'
import { config } from '@/lib/config/environment'

export interface EmailResult {
  success: boolean
  data?: unknown
  error?: unknown
  skipped?: boolean
  message?: string
}

let resendClient: Resend | null | undefined

const getResendClient = (): Resend | null => {
  if (resendClient !== undefined) {
    return resendClient
  }

  const apiKey = config.email.resendApiKey

  if (!apiKey) {
    console.warn('Resend API key not configured. Email delivery disabled.')
    resendClient = null
    return resendClient
  }

  resendClient = new Resend(apiKey)
  return resendClient
}

export interface EmailOptions {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
  }>
}

export interface EmailData {
  manualTitle: string
  manualRevision: string
  manualUrl: string
  recipientName: string
  senderName: string
  comment?: string
  effectiveDate?: string
  rejectionReason?: string
}

/**
 * Send email for manual review request
 */
export async function sendReviewRequestEmail(
  options: EmailOptions,
  data: EmailData
) : Promise<EmailResult> {
  const { to, cc, bcc, replyTo } = options
  const subject = `Review Request: ${data.manualTitle} (Rev ${data.manualRevision})`

  const client = getResendClient()

  if (!client) {
    const message = 'Skipped review request email because Resend API key is missing.'
    console.warn(message, { to })
    return { success: false, skipped: true, message }
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d; }
          .info-box { background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          h2 { color: #212529; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📋 Manual Review Request</h2>
          </div>
          <div class="content">
            <p>Dear ${data.recipientName},</p>

            <p>${data.senderName} has submitted the following manual for your review:</p>

            <div class="info-box">
              <strong>Manual:</strong> ${data.manualTitle}<br>
              <strong>Revision:</strong> ${data.manualRevision}<br>
              ${data.comment ? `<strong>Comment:</strong> ${data.comment}<br>` : ''}
            </div>

            <p>Please review the manual at your earliest convenience and provide your decision.</p>

            <a href="${data.manualUrl}" class="button">Review Manual</a>

            <div class="footer">
              <p>This is an automated notification from OpsWriter.</p>
              <p>© ${new Date().getFullYear()} Heli Air Sweden. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    const response = await client.emails.send({
      from: `${config.email.fromName} <${config.email.fromAddress}>`,
      to: Array.isArray(to) ? to : [to],
      cc,
      bcc,
      reply_to: replyTo,
      subject,
      html,
    })

    return { success: true, data: response }
  } catch (error) {
    console.error('Failed to send review request email:', error)
    return { success: false, error }
  }
}

/**
 * Send email for manual approval notification
 */
export async function sendApprovalEmail(
  options: EmailOptions,
  data: EmailData
) : Promise<EmailResult> {
  const { to, cc, bcc, replyTo } = options
  const subject = `✅ Approved: ${data.manualTitle} (Rev ${data.manualRevision})`

  const client = getResendClient()

  if (!client) {
    const message = 'Skipped approval email because Resend API key is missing.'
    console.warn(message, { to })
    return { success: false, skipped: true, message }
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dcfce7; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d; }
          .info-box { background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .success-badge { background-color: #22c55e; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          h2 { color: #212529; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ Manual Approved</h2>
          </div>
          <div class="content">
            <p>Dear ${data.recipientName},</p>

            <p>Great news! Your manual has been approved:</p>

            <div class="info-box">
              <strong>Manual:</strong> ${data.manualTitle}<br>
              <strong>Revision:</strong> ${data.manualRevision} <span class="success-badge">APPROVED</span><br>
              <strong>Effective Date:</strong> ${data.effectiveDate || 'Immediate'}<br>
              ${data.comment ? `<strong>Approval Comment:</strong> ${data.comment}<br>` : ''}
            </div>

            <p>The manual is now active and available for export.</p>

            <a href="${data.manualUrl}" class="button">View Manual</a>

            <div class="footer">
              <p>This is an automated notification from OpsWriter.</p>
              <p>© ${new Date().getFullYear()} Heli Air Sweden. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    const response = await client.emails.send({
      from: `${config.email.fromName} <${config.email.fromAddress}>`,
      to: Array.isArray(to) ? to : [to],
      cc,
      bcc,
      reply_to: replyTo,
      subject,
      html,
    })

    return { success: true, data: response }
  } catch (error) {
    console.error('Failed to send approval email:', error)
    return { success: false, error }
  }
}

/**
 * Send email for manual rejection notification
 */
export async function sendRejectionEmail(
  options: EmailOptions,
  data: EmailData
) : Promise<EmailResult> {
  const { to, cc, bcc, replyTo } = options
  const subject = `❌ Rejected: ${data.manualTitle} (Rev ${data.manualRevision})`

  const client = getResendClient()

  if (!client) {
    const message = 'Skipped rejection email because Resend API key is missing.'
    console.warn(message, { to })
    return { success: false, skipped: true, message }
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #fee2e2; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d; }
          .info-box { background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .warning-badge { background-color: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .reason-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
          h2 { color: #212529; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>❌ Manual Rejected</h2>
          </div>
          <div class="content">
            <p>Dear ${data.recipientName},</p>

            <p>Your manual has been rejected and requires further revisions:</p>

            <div class="info-box">
              <strong>Manual:</strong> ${data.manualTitle}<br>
              <strong>Revision:</strong> ${data.manualRevision} <span class="warning-badge">REJECTED</span><br>
            </div>

            ${data.rejectionReason ? `
            <div class="reason-box">
              <strong>Rejection Reason:</strong><br>
              ${data.rejectionReason}
            </div>
            ` : ''}

            <p>The manual has been returned to draft status. Please address the feedback and resubmit for review.</p>

            <a href="${data.manualUrl}" class="button">Edit Manual</a>

            <div class="footer">
              <p>This is an automated notification from OpsWriter.</p>
              <p>© ${new Date().getFullYear()} Heli Air Sweden. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    const response = await client.emails.send({
      from: `${config.email.fromName} <${config.email.fromAddress}>`,
      to: Array.isArray(to) ? to : [to],
      cc,
      bcc,
      reply_to: replyTo,
      subject,
      html,
    })

    return { success: true, data: response }
  } catch (error) {
    console.error('Failed to send rejection email:', error)
    return { success: false, error }
  }
}

/**
 * Send email for manual assignment notification
 */
export async function sendAssignmentEmail(
  options: EmailOptions,
  data: EmailData & { previousOwner?: string }
) : Promise<EmailResult> {
  const { to, cc, bcc, replyTo } = options
  const subject = `📝 Manual Assignment: ${data.manualTitle}`

  const client = getResendClient()

  if (!client) {
    const message = 'Skipped assignment email because Resend API key is missing.'
    console.warn(message, { to })
    return { success: false, skipped: true, message }
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d; }
          .info-box { background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          h2 { color: #212529; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📝 Manual Assigned to You</h2>
          </div>
          <div class="content">
            <p>Dear ${data.recipientName},</p>

            <p>You have been assigned as the owner of the following manual:</p>

            <div class="info-box">
              <strong>Manual:</strong> ${data.manualTitle}<br>
              <strong>Current Revision:</strong> ${data.manualRevision}<br>
              <strong>Assigned By:</strong> ${data.senderName}<br>
              ${data.previousOwner ? `<strong>Previous Owner:</strong> ${data.previousOwner}<br>` : ''}
            </div>

            <p>As the owner, you are now responsible for maintaining and updating this manual.</p>

            <a href="${data.manualUrl}" class="button">View Manual</a>

            <div class="footer">
              <p>This is an automated notification from OpsWriter.</p>
              <p>© ${new Date().getFullYear()} Heli Air Sweden. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    const response = await client.emails.send({
      from: `${config.email.fromName} <${config.email.fromAddress}>`,
      to: Array.isArray(to) ? to : [to],
      cc,
      bcc,
      reply_to: replyTo,
      subject,
      html,
    })

    return { success: true, data: response }
  } catch (error) {
    console.error('Failed to send assignment email:', error)
    return { success: false, error }
  }
}

/**
 * Send a custom email with provided content
 */
export async function sendCustomEmail(
  options: EmailOptions & { subject: string; html: string; text?: string }
) : Promise<EmailResult> {
  const { to, cc, bcc, replyTo, subject, html, text, attachments } = options

  const client = getResendClient()

  if (!client) {
    const message = 'Skipped custom email because Resend API key is missing.'
    console.warn(message, { to, subject })
    return { success: false, skipped: true, message }
  }

  try {
    const response = await client.emails.send({
      from: `${config.email.fromName} <${config.email.fromAddress}>`,
      to: Array.isArray(to) ? to : [to],
      cc,
      bcc,
      reply_to: replyTo,
      subject,
      html,
      text,
      attachments,
    })

    return { success: true, data: response }
  } catch (error) {
    console.error('Failed to send custom email:', error)
    return { success: false, error }
  }
}
