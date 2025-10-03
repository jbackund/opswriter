'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, X, Calendar, AlertCircle } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { createClient } from '@/lib/supabase/client'

interface ManualReviewActionsProps {
  manualId: string
  revisionId: string
  revisionNumber: string
}

export default function ManualReviewActions({ manualId, revisionId, revisionNumber }: ManualReviewActionsProps) {
  const router = useRouter()
  const { sendApproval, sendRejection } = useNotifications()
  const [effectiveDate, setEffectiveDate] = useState('')
  const [approvalComment, setApprovalComment] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [manualData, setManualData] = useState<any>(null)

  // Fetch manual data for notifications
  useEffect(() => {
    const fetchManualData = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('manuals')
        .select('title, created_by')
        .eq('id', manualId)
        .single()

      if (data) {
        setManualData(data)
      }
    }

    fetchManualData()
  }, [manualId])

  const handleApprove = async () => {
    if (!effectiveDate) {
      setFeedback({ type: 'error', message: 'Effective date is required to approve.' })
      return
    }

    try {
      setSubmitting('approve')
      setFeedback(null)

      const response = await fetch(`/api/manuals/${manualId}/review/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ effectiveDate, comments: approvalComment, revisionId }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to approve manual')
      }

      // Send approval notification to the manual owner
      if (manualData?.created_by) {
        await sendApproval(manualData.created_by, {
          manualId,
          manualTitle: manualData.title,
          manualRevision: revisionNumber,
          manualUrl: `${window.location.origin}/dashboard/manuals/${manualId}/view`,
          comment: approvalComment,
          effectiveDate,
        })
      }

      setFeedback({ type: 'success', message: 'Manual approved. Redirecting…' })
      setTimeout(() => {
        router.push(`/dashboard/manuals/${manualId}/view`)
        router.refresh()
      }, 1200)
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message: error?.message || 'Failed to approve manual',
      })
    } finally {
      setSubmitting(null)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a rejection reason.' })
      return
    }

    try {
      setSubmitting('reject')
      setFeedback(null)

      const response = await fetch(`/api/manuals/${manualId}/review/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason, revisionId }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to reject manual')
      }

      // Send rejection notification to the manual owner
      if (manualData?.created_by) {
        await sendRejection(manualData.created_by, {
          manualId,
          manualTitle: manualData.title,
          manualRevision: revisionNumber,
          manualUrl: `${window.location.origin}/dashboard/manuals/${manualId}/edit`,
          rejectionReason,
        })
      }

      setFeedback({ type: 'success', message: 'Manual rejected. Returning to list…' })
      setTimeout(() => {
        router.push('/dashboard/manuals')
        router.refresh()
      }, 1200)
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message: error?.message || 'Failed to reject manual',
      })
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 p-5 bg-white shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Approve Manual</h3>
        <p className="mt-1 text-sm text-gray-600">
          Approving will finalize revision <strong>{revisionNumber}</strong> and lock further edits
          until a new draft is submitted.
        </p>

        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Effective Date
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={effectiveDate}
                onChange={(event) => setEffectiveDate(event.target.value)}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-docgen-blue focus:ring-docgen-blue sm:text-sm"
              />
            </div>
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Approval Notes (optional)
            <textarea
              value={approvalComment}
              onChange={(event) => setApprovalComment(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-docgen-blue focus:ring-docgen-blue sm:text-sm"
              rows={3}
              placeholder="Document any conditions or remarks for this approval."
            />
          </label>

          <button
            onClick={handleApprove}
            disabled={submitting !== null}
            className="inline-flex items-center rounded-md bg-status-green px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {submitting === 'approve' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Approve Manual
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-5 bg-white shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Reject Manual</h3>
        <p className="mt-1 text-sm text-gray-600">
          Rejection returns the manual to draft for further edits. The owner will be notified with
          your feedback.
        </p>

        <label className="mt-4 block text-sm font-medium text-gray-700">
          Rejection Reason
          <textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-docgen-blue focus:ring-docgen-blue sm:text-sm"
            rows={4}
            placeholder="Explain what needs to change before approval."
          />
        </label>

        <button
          onClick={handleReject}
          disabled={submitting !== null}
          className="mt-4 inline-flex items-center rounded-md bg-status-red px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {submitting === 'reject' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <X className="mr-2 h-4 w-4" />
          )}
          Reject Manual
        </button>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  )
}
