'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  Edit,
  Eye,
  Download,
  Send,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Copy,
  Loader2,
  GitBranch,
} from 'lucide-react'

interface UserProfile {
  full_name: string
  email: string
}

interface Manual {
  id: string
  title: string
  organization_name: string
  manual_code: string
  current_revision: string
  status: string
  effective_date: string | null
  created_by: string
  created_by_user: UserProfile
  updated_at: string
  tags?: string[]
  is_archived: boolean
}

interface ManualsListProps {
  initialManuals: Manual[]
}

type SortField = 'title' | 'manual_code' | 'current_revision' | 'status' | 'effective_date' | 'created_by_user' | 'updated_at'
type SortDirection = 'asc' | 'desc'
type StatusFilter = 'all' | 'draft' | 'in_review' | 'approved' | 'rejected'

export default function ManualsList({ initialManuals }: ManualsListProps) {
  const [manuals, setManuals] = useState<Manual[]>(initialManuals)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('updated_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [selectedManualForClone, setSelectedManualForClone] = useState<Manual | null>(null)
  const [cloneTitle, setCloneTitle] = useState('')
  const [cloneCode, setCloneCode] = useState('')
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!actionFeedback) return

    const timer = setTimeout(() => setActionFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [actionFeedback])

  // Get unique owners and tags for filter options
  const uniqueOwners = useMemo(() => {
    const owners = manuals.map(m => m.created_by_user?.full_name || m.created_by_user?.email || 'Unknown')
    return Array.from(new Set(owners)).sort()
  }, [manuals])

  const uniqueTags = useMemo(() => {
    const allTags = manuals.flatMap(m => m.tags || [])
    return Array.from(new Set(allTags)).sort()
  }, [manuals])

  // Filter and sort manuals
  const filteredAndSortedManuals = useMemo(() => {
    let filtered = [...manuals]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(manual =>
        manual.title.toLowerCase().includes(query) ||
        manual.manual_code.toLowerCase().includes(query) ||
        manual.organization_name.toLowerCase().includes(query) ||
        (manual.created_by_user?.full_name || '').toLowerCase().includes(query) ||
        (manual.created_by_user?.email || '').toLowerCase().includes(query) ||
        (manual.tags || []).some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(manual => manual.status === statusFilter)
    }

    // Owner filter
    if (ownerFilter !== 'all') {
      filtered = filtered.filter(manual => {
        const owner = manual.created_by_user?.full_name || manual.created_by_user?.email || 'Unknown'
        return owner === ownerFilter
      })
    }

    // Tag filter
    if (tagFilter) {
      filtered = filtered.filter(manual => (manual.tags || []).includes(tagFilter))
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof Manual]
      let bVal: any = b[sortField as keyof Manual]

      // Special handling for created_by_user
      if (sortField === 'created_by_user') {
        aVal = a.created_by_user?.full_name || a.created_by_user?.email || ''
        bVal = b.created_by_user?.full_name || b.created_by_user?.email || ''
      }

      // Handle null values
      if (aVal === null) aVal = ''
      if (bVal === null) bVal = ''

      // Sort strings case-insensitively
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }, [manuals, searchQuery, statusFilter, ownerFilter, tagFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setOwnerFilter('all')
    setTagFilter('')
    setSortField('updated_at')
    setSortDirection('desc')
  }

  const activeFilterCount = [
    statusFilter !== 'all',
    ownerFilter !== 'all',
    tagFilter !== ''
  ].filter(Boolean).length

  const handleCloneManual = (manual: Manual) => {
    setSelectedManualForClone(manual)
    setCloneTitle(`${manual.title} (Copy)`)
    setCloneCode(`${manual.manual_code}-COPY`)
    setShowCloneModal(true)
  }

  const handleExportManual = async (manual: Manual) => {
    const exportConfig = (() => {
      switch (manual.status) {
        case 'draft':
          return { exportType: 'watermarked' as const, includeWatermark: true }
        case 'in_review':
          return { exportType: 'diff' as const, includeWatermark: false }
        case 'approved':
          return { exportType: 'clean' as const, includeWatermark: false }
        case 'rejected':
          return { exportType: 'watermarked' as const, includeWatermark: true }
        default:
          return { exportType: 'clean' as const, includeWatermark: false }
      }
    })()

    try {
      setExportLoading(manual.id)
      setActionFeedback(null)

      const response = await fetch(`/api/manuals/${manual.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exportType: exportConfig.exportType,
          includeWatermark: exportConfig.includeWatermark,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.downloadUrl) {
        throw new Error(payload?.error || 'Failed to export manual')
      }

      const newTab = window.open(payload.downloadUrl, '_blank', 'noopener,noreferrer')

      if (!newTab) {
        const link = document.createElement('a')
        link.href = payload.downloadUrl
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      setActionFeedback({
        type: 'success',
        message: 'Manual export generated. Download should begin shortly.',
      })
    } catch (error: any) {
      setActionFeedback({
        type: 'error',
        message: error?.message || 'Failed to export manual',
      })
    } finally {
      setExportLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      in_review: 'bg-status-orange text-white',
      approved: 'bg-status-green text-white',
      rejected: 'bg-status-red text-white',
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_review':
        return <Send className="h-4 w-4" />
      case 'approved':
        return <Check className="h-4 w-4" />
      case 'rejected':
        return <X className="h-4 w-4" />
      default:
        return <Edit className="h-4 w-4" />
    }
  }

  const handleSendForReview = async (manual: Manual) => {
    if (!confirm(`Submit "${manual.title}" for review? Editing will be locked until a decision is made.`)) {
      return
    }

    try {
      setActionLoading(manual.id)
      setActionFeedback(null)

      const response = await fetch(`/api/manuals/${manual.id}/submit-review`, {
        method: 'POST',
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to submit manual for review')
      }

      setManuals(prev =>
        prev.map(item =>
          item.id === manual.id
            ? { ...item, status: 'in_review' }
            : item
        )
      )

      const revisionNumber = payload?.revision?.revision_number
      setActionFeedback({
        type: 'success',
        message: revisionNumber
          ? `Manual submitted for review as revision ${revisionNumber}.`
          : 'Manual submitted for review.',
      })
    } catch (error: any) {
      setActionFeedback({
        type: 'error',
        message: error?.message || 'Failed to submit manual for review',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleStartNextRevision = async (manual: Manual) => {
    if (!confirm(`Start a new revision for "${manual.title}"? This will create a draft of the next revision based on the current approved version.`)) {
      return
    }

    try {
      setActionLoading(manual.id)
      setActionFeedback(null)

      const response = await fetch(`/api/manuals/${manual.id}/create-revision`, {
        method: 'POST',
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to create new revision')
      }

      // Update the manual status to draft and increment revision
      setManuals(prev =>
        prev.map(item =>
          item.id === manual.id
            ? {
                ...item,
                status: 'draft',
                current_revision: payload.newRevisionNumber || item.current_revision
              }
            : item
        )
      )

      setActionFeedback({
        type: 'success',
        message: `New revision ${payload.newRevisionNumber} started for "${manual.title}". You can now edit the draft.`,
      })
    } catch (error: any) {
      setActionFeedback({
        type: 'error',
        message: error?.message || 'Failed to create new revision',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <div className="flex flex-col">
          <ChevronUp className="h-3 w-3 text-gray-400" />
          <ChevronDown className="h-3 w-3 text-gray-400 -mt-1" />
        </div>
      )
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="h-4 w-4 text-gray-700" />
      : <ChevronDown className="h-4 w-4 text-gray-700" />
  }

  return (
    <div>
      {actionFeedback && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 text-sm ${
            actionFeedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {actionFeedback.message}
        </div>
      )}
      {/* Search and Filter Bar */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
              placeholder="Search manuals, codes, owners, or tags..."
            />
          </div>
        </div>
        <button
          onClick={() => setShowFilterModal(true)}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-docgen-blue"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-docgen-blue text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filters display */}
      {(searchQuery || activeFilterCount > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {searchQuery && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Search: {searchQuery}
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1.5 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Status: {statusFilter}
              <button
                onClick={() => setStatusFilter('all')}
                className="ml-1.5 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {ownerFilter !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Owner: {ownerFilter}
              <button
                onClick={() => setOwnerFilter('all')}
                className="ml-1.5 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {tagFilter && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Tag: {tagFilter}
              <button
                onClick={() => setTagFilter('')}
                className="ml-1.5 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={resetFilters}
            className="text-xs text-docgen-blue hover:text-blue-700 ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results count */}
      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredAndSortedManuals.length} of {manuals.length} manuals
      </div>

      {/* Manuals Table */}
      <div className="mt-4 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Manual Name</span>
                        <SortIcon field="title" />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('manual_code')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Code</span>
                        <SortIcon field="manual_code" />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('current_revision')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Revision</span>
                        <SortIcon field="current_revision" />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Status</span>
                        <SortIcon field="status" />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('effective_date')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Effective Date</span>
                        <SortIcon field="effective_date" />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('created_by_user')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Owner</span>
                        <SortIcon field="created_by_user" />
                      </div>
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredAndSortedManuals.length > 0 ? (
                    filteredAndSortedManuals.map((manual) => (
                      <tr key={manual.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{manual.title}</div>
                            <div className="text-gray-500">{manual.organization_name}</div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {manual.manual_code}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {manual.current_revision}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                              manual.status
                            )}`}
                          >
                            {getStatusIcon(manual.status)}
                            <span className="ml-1">{manual.status.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatDate(manual.effective_date)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {manual.created_by_user?.full_name || manual.created_by_user?.email}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleCloneManual(manual)}
                              className="text-gray-600 hover:opacity-90"
                              title="Clone Manual"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            {manual.status === 'draft' && (
                              <>
                                <Link
                                  href={`/dashboard/manuals/${manual.id}/edit`}
                                  className="text-docgen-blue hover:opacity-90"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Link>
                                <button
                                  onClick={() => handleExportManual(manual)}
                                  className={`text-gray-600 hover:opacity-90 ${exportLoading === manual.id ? 'cursor-wait opacity-60' : ''}`}
                                  title="Export PDF"
                                  disabled={exportLoading === manual.id || actionLoading === manual.id}
                                >
                                  {exportLoading === manual.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleSendForReview(manual)}
                                  className={`text-status-green hover:opacity-90 ${actionLoading === manual.id || exportLoading === manual.id ? 'cursor-wait opacity-60' : ''}`}
                                  title="Send in Review"
                                  disabled={actionLoading === manual.id || exportLoading === manual.id}
                                >
                                  {actionLoading === manual.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </button>
                              </>
                            )}
                            {manual.status === 'in_review' && (
                              <>
                                <button
                                  onClick={() => handleExportManual(manual)}
                                  className={`text-gray-600 hover:opacity-90 ${exportLoading === manual.id ? 'cursor-wait opacity-60' : ''}`}
                                  title="Export PDF"
                                  disabled={exportLoading === manual.id || actionLoading === manual.id}
                                >
                                  {exportLoading === manual.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </button>
                                <Link
                                  href={`/dashboard/manuals/${manual.id}/review`}
                                  className="text-status-orange hover:opacity-90"
                                  title="Review Manual"
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </>
                            )}
                            {manual.status === 'approved' && (
                              <>
                                <Link
                                  href={`/dashboard/manuals/${manual.id}/view`}
                                  className="text-status-blue hover:opacity-90"
                                  title="View Manual"
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>
                                <button
                                  onClick={() => handleExportManual(manual)}
                                  className={`text-gray-600 hover:opacity-90 ${exportLoading === manual.id ? 'cursor-wait opacity-60' : ''}`}
                                  title="Export PDF"
                                  disabled={exportLoading === manual.id || actionLoading === manual.id}
                                >
                                  {exportLoading === manual.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleStartNextRevision(manual)}
                                  className={`text-docgen-blue hover:opacity-90 ${actionLoading === manual.id || exportLoading === manual.id ? 'cursor-wait opacity-60' : ''}`}
                                  title="Start Next Revision"
                                  disabled={actionLoading === manual.id || exportLoading === manual.id}
                                >
                                  {actionLoading === manual.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <GitBranch className="h-4 w-4" />
                                  )}
                                </button>
                              </>
                            )}
                            {manual.status === 'rejected' && (
                              <>
                                <button
                                  onClick={() => handleExportManual(manual)}
                                  className={`text-gray-600 hover:opacity-90 ${exportLoading === manual.id ? 'cursor-wait opacity-60' : ''}`}
                                  title="Export PDF"
                                  disabled={exportLoading === manual.id || actionLoading === manual.id}
                                >
                                  {exportLoading === manual.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </button>
                                <Link
                                  href={`/dashboard/manuals/${manual.id}/edit`}
                                  className="text-status-red hover:opacity-90"
                                  title="Revise"
                                >
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                        {manuals.length === 0
                          ? 'No manuals found. Create your first manual to get started.'
                          : 'No manuals match the current filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Filter Manuals
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      id="status-filter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm rounded-md"
                    >
                      <option value="all">All Statuses</option>
                      <option value="draft">Draft</option>
                      <option value="in_review">In Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="owner-filter" className="block text-sm font-medium text-gray-700">
                      Owner
                    </label>
                    <select
                      id="owner-filter"
                      value={ownerFilter}
                      onChange={(e) => setOwnerFilter(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm rounded-md"
                    >
                      <option value="all">All Owners</option>
                      {uniqueOwners.map(owner => (
                        <option key={owner} value={owner}>{owner}</option>
                      ))}
                    </select>
                  </div>

                  {uniqueTags.length > 0 && (
                    <div>
                      <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700">
                        Tag
                      </label>
                      <select
                        id="tag-filter"
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm rounded-md"
                      >
                        <option value="">All Tags</option>
                        {uniqueTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-docgen-blue text-base font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-docgen-blue sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetFilters()
                    setShowFilterModal(false)
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:mr-3 sm:w-auto sm:text-sm"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {showCloneModal && selectedManualForClone && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={(e) => {
                e.preventDefault()
                // Clone logic would go here - navigate to new manual form with cloned data
                window.location.href = `/dashboard/manuals/new?clone=${selectedManualForClone.id}&title=${encodeURIComponent(cloneTitle)}&code=${encodeURIComponent(cloneCode)}`
              }}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                      <Copy className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                        Clone Manual
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        This will create a new manual with the same chapter structure as &ldquo;{selectedManualForClone.title}&rdquo;. Content will not be copied.
                      </p>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="clone-title" className="block text-sm font-medium text-gray-700">
                            New Manual Title
                          </label>
                          <input
                            type="text"
                            id="clone-title"
                            value={cloneTitle}
                            onChange={(e) => setCloneTitle(e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="clone-code" className="block text-sm font-medium text-gray-700">
                            New Manual Code
                          </label>
                          <input
                            type="text"
                            id="clone-code"
                            value={cloneCode}
                            onChange={(e) => setCloneCode(e.target.value.toUpperCase())}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-docgen-blue text-base font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-docgen-blue sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Clone Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCloneModal(false)
                      setSelectedManualForClone(null)
                      setCloneTitle('')
                      setCloneCode('')
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
