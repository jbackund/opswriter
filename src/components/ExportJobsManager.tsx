'use client'

import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import {
  ExportJobFilters,
  ExportJobRecord,
  ExportJobStatus,
  ExportJobVariant,
  useExportJobs,
} from '@/hooks/useExportJobs'

type ExportRequestType = 'clean' | 'watermarked' | 'diff'

type UserRole = 'manager' | 'sysadmin' | string
type TimeframeOption = '7d' | '30d' | '90d' | 'all'

interface ExportJobsManagerProps {
  currentUserId: string
  currentUserRole: UserRole
}

interface ManualOption {
  id: string
  title: string
  manual_code: string
}

const variantLabels: Record<ExportJobVariant, string> = {
  draft_watermarked: 'Draft (Watermarked)',
  draft_diff: 'Draft (Diff)',
  clean_approved: 'Approved (Clean)',
}

const statusStyles: Record<ExportJobStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
}

const timeframeOptions: { value: TimeframeOption; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

const statusFilterOptions: { value: ExportJobStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

const variantFilterOptions: { value: ExportJobVariant | 'all'; label: string }[] = [
  { value: 'all', label: 'All variants' },
  { value: 'draft_watermarked', label: variantLabels.draft_watermarked },
  { value: 'draft_diff', label: variantLabels.draft_diff },
  { value: 'clean_approved', label: variantLabels.clean_approved },
]

function computeDateRange(timeframe: TimeframeOption) {
  if (timeframe === 'all') {
    return { from: undefined, to: undefined }
  }

  const now = new Date()
  const from = new Date(now)

  const days =
    timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 0

  from.setDate(now.getDate() - days)

  return {
    from: from.toISOString(),
    to: now.toISOString(),
  }
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '—'

  const thresholds = [
    { unit: 'GB', value: 1024 ** 3 },
    { unit: 'MB', value: 1024 ** 2 },
    { unit: 'KB', value: 1024 },
  ]

  for (const threshold of thresholds) {
    if (bytes >= threshold.value) {
      return `${(bytes / threshold.value).toFixed(1)} ${threshold.unit}`
    }
  }

  return `${bytes} B`
}

function formatDuration(start?: string | null, end?: string | null) {
  if (!start) return '—'
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  const diffMs = endDate.getTime() - startDate.getTime()

  if (diffMs <= 0) return '—'

  const diffSeconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(diffSeconds / 60)
  const seconds = diffSeconds % 60

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }

  return `${seconds}s`
}

function mapVariantToRequest(variant: ExportJobVariant): {
  exportType: ExportRequestType
  includeWatermark: boolean
} {
  switch (variant) {
    case 'draft_diff':
      return { exportType: 'diff', includeWatermark: false }
    case 'draft_watermarked':
      return { exportType: 'watermarked', includeWatermark: true }
    case 'clean_approved':
    default:
      return { exportType: 'clean', includeWatermark: false }
  }
}

function triggerBrowserDownload(url: string, fileName?: string) {
  const newTab = window.open(url, '_blank', 'noopener,noreferrer')
  if (!newTab) {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    if (fileName) {
      link.download = fileName
    }
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

async function extractErrorMessage(response: Response) {
  try {
    const data = await response.json()
    if (typeof data === 'string') return data
    return data?.error || data?.message || ''
  } catch (error) {
    return ''
  }
}

function StatusBadge({ status }: { status: ExportJobStatus }) {
  const Icon =
    status === 'completed'
      ? CheckCircle2
      : status === 'failed'
      ? XCircle
      : status === 'processing'
      ? Loader2
      : Clock

  const iconClasses =
    status === 'processing' ? 'h-3 w-3 animate-spin mr-1' : 'h-3 w-3 mr-1'

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      <Icon className={iconClasses} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function ExportJobsManager({
  currentUserId,
  currentUserRole,
}: ExportJobsManagerProps) {
  const [statusFilter, setStatusFilter] = useState<ExportJobStatus | 'all'>('all')
  const [variantFilter, setVariantFilter] = useState<ExportJobVariant | 'all'>('all')
  const [manualFilter, setManualFilter] = useState<string>('all')
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d')
  const [searchTerm, setSearchTerm] = useState('')
  const [scope, setScope] = useState<'all' | 'mine'>('all')

  const [dateRange, setDateRange] = useState(() => computeDateRange('30d'))

  useEffect(() => {
    setDateRange(computeDateRange(timeframe))
  }, [timeframe])

  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 350)

  const queryFilters = useMemo(() => {
    const filters: ExportJobFilters = {}

    if (statusFilter !== 'all') {
      filters.status = statusFilter
    }

    if (variantFilter !== 'all') {
      filters.variant = variantFilter
    }

    if (manualFilter !== 'all') {
      filters.manualId = manualFilter
    }

    if (scope === 'mine') {
      filters.createdBy = currentUserId
    }

    if (dateRange.from) {
      filters.fromDate = dateRange.from
    }

    if (dateRange.to) {
      filters.toDate = dateRange.to
    }

    if (debouncedSearch) {
      filters.search = debouncedSearch
    }

    return filters
  }, [
    statusFilter,
    variantFilter,
    manualFilter,
    scope,
    currentUserId,
    dateRange,
    debouncedSearch,
  ])

  const {
    data: jobs = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useExportJobs(queryFilters)

  const { data: manualOptions = [] } = useQuery<ManualOption[]>({
    queryKey: ['export-jobs', 'manual-options'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error: manualError } = await supabase
        .from('manuals')
        .select('id, title, manual_code')
        .order('title', { ascending: true })

      if (manualError) {
        throw manualError
      }

      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  const summary = useMemo(() => {
    const totals = {
      total: jobs.length,
      completed: 0,
      failed: 0,
      inProgress: 0,
    }

    for (const job of jobs) {
      if (job.status === 'completed') {
        totals.completed += 1
      } else if (job.status === 'failed') {
        totals.failed += 1
      } else {
        totals.inProgress += 1
      }
    }

    const successRate = totals.total
      ? Math.round((totals.completed / totals.total) * 100)
      : 0

    return { ...totals, successRate }
  }, [jobs])

  const uniqueRequesters = useMemo(() => {
    const entries = new Map<string, { name: string; email: string }>()
    jobs.forEach(job => {
      if (job.requester?.id) {
        entries.set(job.requester.id, {
          name: job.requester.full_name || '—',
          email: job.requester.email || '',
        })
      }
    })
    return Array.from(entries.values())
  }, [jobs])

  const handleDownload = async (job: ExportJobRecord) => {
    const response = await fetch(
      `/api/manuals/${job.manual_id}/export-async?jobId=${job.id}`
    )

    if (!response.ok) {
      const message = await extractErrorMessage(response)
      throw new Error(message || 'Unable to refresh download link')
    }

    const payload = await response.json()

    if (!payload.downloadUrl) {
      throw new Error('Export file is not available yet')
    }

    triggerBrowserDownload(payload.downloadUrl, payload.fileName)
    await refetch()
  }

  const handleRetry = async (job: ExportJobRecord) => {
    const { exportType, includeWatermark } = mapVariantToRequest(job.variant)

    const response = await fetch(`/api/manuals/${job.manual_id}/export-async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ exportType, includeWatermark }),
    })

    if (!response.ok) {
      const message = await extractErrorMessage(response)
      throw new Error(message || 'Unable to retry export job')
    }

    await refetch()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Export Jobs</h1>
          <p className="text-sm text-gray-500">
            Monitor PDF export activity, troubleshoot failures, and manage download links.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-docgen-blue focus:ring-offset-2"
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total jobs"
          value={summary.total}
          helper={`${summary.inProgress} in progress`}
        />
        <SummaryCard
          label="Completed"
          value={summary.completed}
          tone="success"
          helper={`${summary.successRate}% success rate`}
        />
        <SummaryCard
          label="Failed"
          value={summary.failed}
          tone="danger"
          helper={summary.failed > 0 ? 'Needs attention' : 'All clear'}
        />
        <SummaryCard
          label="Unique requesters"
          value={uniqueRequesters.length}
          helper={currentUserRole === 'sysadmin' ? 'Includes all users' : 'Your own exports'}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:border-docgen-blue focus:outline-none focus:ring-1 focus:ring-docgen-blue"
              placeholder="Search by manual title, code, or requester"
            />
          </div>

          <select
            value={manualFilter}
            onChange={event => setManualFilter(event.target.value)}
            className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 focus:border-docgen-blue focus:outline-none focus:ring-1 focus:ring-docgen-blue"
          >
            <option value="all">All manuals</option>
            {manualOptions.map(manual => (
              <option key={manual.id} value={manual.id}>
                {manual.manual_code} · {manual.title}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as ExportJobStatus | 'all')}
            className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 focus:border-docgen-blue focus:outline-none focus:ring-1 focus:ring-docgen-blue"
          >
            {statusFilterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={variantFilter}
            onChange={event =>
              setVariantFilter(event.target.value as ExportJobVariant | 'all')
            }
            className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 focus:border-docgen-blue focus:outline-none focus:ring-1 focus:ring-docgen-blue"
          >
            {variantFilterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={timeframe}
            onChange={event => setTimeframe(event.target.value as TimeframeOption)}
            className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 focus:border-docgen-blue focus:outline-none focus:ring-1 focus:ring-docgen-blue"
          >
            {timeframeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center rounded-md border border-gray-300 bg-white p-0.5">
            <button
              onClick={() => setScope('all')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                scope === 'all'
                  ? 'bg-docgen-blue text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All jobs
            </button>
            <button
              onClick={() => setScope('mine')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                scope === 'mine'
                  ? 'bg-docgen-blue text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              My jobs
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Filter className="h-3.5 w-3.5" />
          <span>
            Showing {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
            {scope === 'mine' ? ' requested by you' : ''}
          </span>
          {isFetching && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Updating…</span>}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Manual
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Variant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Requested By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Timeline
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                File
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Expires
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <SkeletonRows />
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                  No export jobs match the current filters.
                </td>
              </tr>
            ) : (
              jobs.map(job => (
                <ExportJobRow
                  key={job.id}
                  job={job}
                  onDownload={handleDownload}
                  onRetry={handleRetry}
                />
              ))
            )}
          </tbody>
        </table>

        {error && (
          <div className="border-t border-gray-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Unable to load export jobs. Please refresh or try again later.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string
  value: number
  helper?: string
  tone?: 'default' | 'success' | 'danger'
}) {
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50'
      : tone === 'danger'
      ? 'border-rose-200 bg-rose-50'
      : 'border-gray-200 bg-white'

  return (
    <div className={`rounded-lg border ${toneClasses} p-4 shadow-sm`}> 
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {helper && <div className="mt-1 text-xs text-gray-500">{helper}</div>}
    </div>
  )
}

function ExportJobRow({
  job,
  onDownload,
  onRetry,
}: {
  job: ExportJobRecord
  onDownload: (job: ExportJobRecord) => Promise<void>
  onRetry: (job: ExportJobRecord) => Promise<void>
}) {
  const manualTitle = job.manual?.title || 'Manual removed'
  const manualCode = job.manual?.manual_code || job.manual_id
  const requesterName = job.requester?.full_name || '—'
  const requesterEmail = job.requester?.email || ''
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!actionSuccess) return
    const timeout = setTimeout(() => setActionSuccess(null), 3000)
    return () => clearTimeout(timeout)
  }, [actionSuccess])

  const handleDownloadClick = async () => {
    try {
      setActionError(null)
      setActionSuccess(null)
      setIsDownloading(true)
      await onDownload(job)
      setActionSuccess('Download ready')
    } catch (err: any) {
      setActionError(err?.message || 'Unable to download export')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleRetryClick = async () => {
    try {
      setActionError(null)
      setActionSuccess(null)
      setIsRetrying(true)
      await onRetry(job)
      setActionSuccess('Export retriggered')
    } catch (err: any) {
      setActionError(err?.message || 'Unable to retry export')
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <tr>
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-gray-900">{manualTitle}</div>
        <div className="text-xs text-gray-500">{manualCode}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-700">{variantLabels[job.variant]}</div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={job.status} />
          {job.error_message && job.status === 'failed' && (
            <span className="text-xs text-rose-600">{job.error_message}</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-700">{requesterName}</div>
        {requesterEmail && <div className="text-xs text-gray-500">{requesterEmail}</div>}
        <div className="text-xs text-gray-400 mt-1">Requested {formatDateTime(job.created_at)}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">Started:</span> {formatDateTime(job.processing_started_at)}
        </div>
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">Completed:</span> {formatDateTime(job.processing_completed_at)}
        </div>
        <div className="text-xs text-gray-400">Duration {formatDuration(job.processing_started_at, job.processing_completed_at)}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-700">{job.file_path ? job.file_path.split('/').pop() : '—'}</div>
        <div className="text-xs text-gray-500">{formatFileSize(job.file_size_bytes)}</div>
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-700">
        {formatDateTime(job.expires_at)}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleDownloadClick}
              disabled={isDownloading || job.status !== 'completed'}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <DownloadIcon />
              )}
              Download
            </button>

            {job.status === 'failed' && (
              <button
                onClick={handleRetryClick}
                disabled={isRetrying}
                className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRetrying ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-3 w-3" />
                )}
                Retry
              </button>
            )}
          </div>

          {actionError && (
            <div className="flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {actionError}
            </div>
          )}

          {actionSuccess && (
            <div className="text-xs text-emerald-600">{actionSuccess}</div>
          )}
        </div>
      </td>
    </tr>
  )
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mr-2 h-3 w-3"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          <td className="px-6 py-4">
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-24 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 w-28 rounded bg-gray-200" />
          </td>
          <td className="px-6 py-4">
            <div className="h-5 w-28 rounded-full bg-gray-200" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-20 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-4">
            <div className="h-3 w-32 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-24 rounded bg-gray-100" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 w-36 rounded bg-gray-200" />
          </td>
          <td className="px-6 py-4">
            <div className="ml-auto h-4 w-24 rounded bg-gray-200" />
          </td>
          <td className="px-6 py-4 text-right">
            <div className="ml-auto h-8 w-20 rounded bg-gray-200" />
          </td>
        </tr>
      ))}
    </>
  )
}
