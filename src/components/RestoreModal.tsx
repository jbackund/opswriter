'use client'

import { useState } from 'react'
import { RotateCcw, X, AlertTriangle, Loader2 } from 'lucide-react'

interface Revision {
  id: string
  revision_number: string
  snapshot: any
  changes_summary: string | null
  created_at: string
  created_by_user: {
    full_name: string
  }
}

interface RestoreModalProps {
  revision: Revision
  manualId: string
  onClose: () => void
  onSuccess: () => void
}

export default function RestoreModal({
  revision,
  manualId,
  onClose,
  onSuccess,
}: RestoreModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRestore = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/manuals/${manualId}/restore-from-revision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          revision_id: revision.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to restore revision')
      }

      onSuccess()
    } catch (err: any) {
      console.error('Error restoring revision:', err)
      setError(err.message || 'Failed to restore revision')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-6 w-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Restore from Revision</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Warning</h3>
                <p className="text-sm text-yellow-800">
                  This action will restore the manual to the state it was in at{' '}
                  <strong>Revision {revision.revision_number}</strong>. All current unsaved
                  changes will be lost, and the manual will be set to draft status.
                </p>
              </div>
            </div>
          </div>

          {/* Revision Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Revision Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Revision Number:</dt>
                <dd className="font-semibold text-gray-900">{revision.revision_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Created:</dt>
                <dd className="text-gray-900">{formatDate(revision.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Created By:</dt>
                <dd className="text-gray-900">{revision.created_by_user?.full_name}</dd>
              </div>
              {revision.changes_summary && (
                <div className="pt-2 border-t">
                  <dt className="text-gray-600 mb-1">Changes Summary:</dt>
                  <dd className="text-gray-900">{revision.changes_summary}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* What will happen */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">What will happen:</h3>
            <ul className="text-sm text-blue-800 space-y-1.5 list-disc list-inside">
              <li>Manual metadata will be restored to revision {revision.revision_number}</li>
              <li>All chapters and content will be restored to their historical state</li>
              <li>Current chapters and content will be replaced</li>
              <li>Manual status will be set to &ldquo;Draft&rdquo;</li>
              <li>A new revision snapshot will be created for this restore operation</li>
              <li>The action will be logged in the audit trail</li>
            </ul>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRestore}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Confirm Restore
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
