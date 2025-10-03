/**
 * Hook for sending email notifications
 */
import { useState } from 'react'

interface NotificationData {
  manualId: string
  manualTitle: string
  manualRevision: string
  manualUrl: string
  comment?: string
  effectiveDate?: string
  rejectionReason?: string
  previousOwner?: string
}

interface NotificationOptions {
  type: 'review_request' | 'approval' | 'rejection' | 'assignment'
  recipients: string | string[] // User IDs
  data: NotificationData
}

export function useNotifications() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendNotification = async (options: NotificationOptions) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send notification')
      }

      setLoading(false)
      return { success: true, data: result }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setLoading(false)
      return { success: false, error: message }
    }
  }

  const sendReviewRequest = async (
    recipients: string | string[],
    data: NotificationData
  ) => {
    return sendNotification({
      type: 'review_request',
      recipients,
      data,
    })
  }

  const sendApproval = async (
    recipient: string,
    data: NotificationData
  ) => {
    return sendNotification({
      type: 'approval',
      recipients: recipient,
      data,
    })
  }

  const sendRejection = async (
    recipient: string,
    data: NotificationData
  ) => {
    return sendNotification({
      type: 'rejection',
      recipients: recipient,
      data,
    })
  }

  const sendAssignment = async (
    recipient: string,
    data: NotificationData
  ) => {
    return sendNotification({
      type: 'assignment',
      recipients: recipient,
      data,
    })
  }

  return {
    loading,
    error,
    sendNotification,
    sendReviewRequest,
    sendApproval,
    sendRejection,
    sendAssignment,
  }
}