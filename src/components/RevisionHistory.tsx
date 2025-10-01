'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Calendar,
  ChevronRight,
  Eye,
  RotateCcw,
  GitBranch,
  AlertCircle,
  Filter,
} from 'lucide-react'

interface Revision {
  id: string
  manual_id: string
  revision_number: string
  status: 'draft' | 'in_review' | 'approved' | 'rejected'
  snapshot: any
  changes_summary: string | null
  chapters_affected: string[] | null
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  rejection_reason: string | null
  submitted_for_review_at: string | null
  submitted_by: string | null
  created_at: string
  updated_at: string
  created_by: string
  created_by_user: {
    full_name: string
    email: string
  }
  approved_by_user?: {
    full_name: string
    email: string
  }
  rejected_by_user?: {
    full_name: string
    email: string
  }
  submitted_by_user?: {
    full_name: string
    email: string
  }
}

interface RevisionHistoryProps {
  manualId: string
  currentRevision: string
  onViewRevision: (revision: Revision) => void
  onRestoreRevision: (revision: Revision) => void
  onCompareRevisions: (revisionA: Revision, revisionB: Revision) => void
}

export default function RevisionHistory({
  manualId,
  currentRevision,
  onViewRevision,
  onRestoreRevision,
  onCompareRevisions,
}: RevisionHistoryProps) {
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedForCompare, setSelectedForCompare] = useState<Revision | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchRevisions()
  }, [manualId])

  const fetchRevisions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/manuals/${manualId}/revisions`)
      if (!response.ok) {
        throw new Error('Failed to fetch revisions')
      }

      const data = await response.json()
      setRevisions(data.revisions || [])
    } catch (err) {
      console.error('Error fetching revisions:', err)
      setError('Failed to load revision history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { color: 'bg-orange-100 text-orange-800', icon: FileText, label: 'Draft' },
      in_review: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'In Review' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' },
    }
    return badges[status as keyof typeof badges] || badges.draft
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

  const isCurrentRevision = (revision: Revision) => {
    return revision.revision_number === currentRevision
  }

  const handleSelectForCompare = (revision: Revision) => {
    if (selectedForCompare && selectedForCompare.id !== revision.id) {
      onCompareRevisions(selectedForCompare, revision)
      setSelectedForCompare(null)
    } else {
      setSelectedForCompare(revision)
    }
  }

  const filteredRevisions = filterStatus === 'all'
    ? revisions
    : revisions.filter(r => r.status === filterStatus)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Revision History</h2>
          <p className="text-sm text-gray-600 mt-1">
            Complete timeline of all revisions (indefinite retention)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {selectedForCompare && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Compare mode:</strong> Selected revision {selectedForCompare.revision_number}.
            Click another revision to compare.
            <button
              onClick={() => setSelectedForCompare(null)}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Cancel
            </button>
          </p>
        </div>
      )}

      {/* Revisions Timeline */}
      <div className="space-y-3">
        {filteredRevisions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No revisions found</p>
          </div>
        ) : (
          filteredRevisions.map((revision, index) => {
            const statusBadge = getStatusBadge(revision.status)
            const StatusIcon = statusBadge.icon
            const isCurrent = isCurrentRevision(revision)
            const isSelected = selectedForCompare?.id === revision.id

            return (
              <div
                key={revision.id}
                className={`border rounded-lg p-4 transition-all ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : isSelected
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          Revision {revision.revision_number}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusBadge.label}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
                          CURRENT
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Created: {formatDate(revision.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>By: {revision.created_by_user?.full_name || 'Unknown'}</span>
                      </div>
                      {revision.changes_summary && (
                        <div className="flex items-start gap-2 mt-2">
                          <FileText className="h-4 w-4 mt-0.5" />
                          <p className="text-gray-700">{revision.changes_summary}</p>
                        </div>
                      )}
                      {revision.chapters_affected && revision.chapters_affected.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <span className="text-gray-500">Chapters affected:</span>
                          {revision.chapters_affected.map((chapter, i) => (
                            <span
                              key={i}
                              className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {chapter}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Approval/Rejection Info */}
                    {revision.status === 'approved' && revision.approved_at && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                        <span className="text-green-800">
                          <strong>Approved</strong> by {revision.approved_by_user?.full_name} on{' '}
                          {formatDate(revision.approved_at)}
                        </span>
                      </div>
                    )}
                    {revision.status === 'rejected' && revision.rejected_at && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <span className="text-red-800">
                          <strong>Rejected</strong> by {revision.rejected_by_user?.full_name} on{' '}
                          {formatDate(revision.rejected_at)}
                        </span>
                        {revision.rejection_reason && (
                          <p className="mt-1 text-red-700">Reason: {revision.rejection_reason}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => onViewRevision(revision)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
                      title="View this revision"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleSelectForCompare(revision)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md transition-colors ${
                        isSelected
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : 'text-gray-600 hover:bg-gray-50 border-gray-200'
                      }`}
                      title="Select for comparison"
                    >
                      <GitBranch className="h-4 w-4" />
                      {isSelected ? 'Selected' : 'Compare'}
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={() => onRestoreRevision(revision)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 border border-orange-200 rounded-md transition-colors"
                        title="Restore from this revision"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
