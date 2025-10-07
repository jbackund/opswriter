'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Shield,
  Filter,
  Download,
  User,
  Calendar,
  FileText,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface AuditLog {
  id: string
  action: string // INSERT, UPDATE, DELETE
  entity_type: string // manuals, chapters, content_blocks, etc.
  entity_id: string | null
  details: any
  metadata?: any
  actor_id: string | null
  actor_email: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user_id: string | null
  user?:
    | {
        full_name: string | null
        email: string | null
      }
    | null
}

interface ActorProfile {
  full_name: string | null
  email: string | null
}

interface AuditTrailProps {
  manualId: string
}

export default function AuditTrail({ manualId }: AuditTrailProps) {
  const supabase = useMemo(() => createClient(), [])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actorProfiles, setActorProfiles] = useState<Record<string, ActorProfile>>({})
  const profilesRef = useRef<Record<string, ActorProfile>>({})
  const isMountedRef = useRef(true)
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadActorProfiles = useCallback(
    async (actorIds: Array<string | null | undefined>) => {
      const missingIds = actorIds
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
        .filter(id => !profilesRef.current[id])

      if (missingIds.length === 0) {
        return
      }

      const { data, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', missingIds)

      if (profileError) {
        console.error('Failed to load audit user profiles:', profileError)
        return
      }

      if (!data || !isMountedRef.current) {
        return
      }

      setActorProfiles(prev => {
        const next = { ...prev }
        data.forEach(profile => {
          next[profile.id] = {
            full_name: profile.full_name ?? null,
            email: profile.email ?? null,
          }
        })
        profilesRef.current = next
        return next
      })
    },
    [supabase]
  )

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      })

      const response = await fetch(`/api/manuals/${manualId}/audit-logs?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      const data = await response.json()
      const fetchedLogs: AuditLog[] = (data.audit_logs || []).map((log: any) => ({
        ...log,
        details: log.details ?? log.metadata ?? null,
      }))

      if (isMountedRef.current) {
        setAuditLogs(fetchedLogs)
        setTotalPages(data.pagination?.totalPages || 1)
      }

      await loadActorProfiles(fetchedLogs.map(log => log.actor_id))
    } catch (err) {
      console.error('Error fetching audit logs:', err)
      if (isMountedRef.current) {
        setError('Failed to load audit trail')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [filters, loadActorProfiles, manualId, page])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  const resolveActorInfo = useCallback(
    (log: AuditLog): { name: string; email?: string } => {
      const profile = log.actor_id ? actorProfiles[log.actor_id] : undefined
      const joinedProfile = log.user

      const fullName = joinedProfile?.full_name || profile?.full_name || null
      const fallbackIdentifier =
        joinedProfile?.email ||
        profile?.email ||
        (typeof log.actor_email === 'string' ? log.actor_email : undefined) ||
        (typeof log.details?.actor_email === 'string' ? log.details.actor_email : undefined)

      const emailCandidate =
        joinedProfile?.email ||
        profile?.email ||
        (typeof log.actor_email === 'string' && log.actor_email.includes('@')
          ? log.actor_email
          : undefined) ||
        (typeof log.details?.actor_email === 'string' && log.details.actor_email.includes('@')
          ? log.details.actor_email
          : undefined)

      const name = fullName || fallbackIdentifier || 'System'

      return {
        name,
        email: emailCandidate && emailCandidate !== name ? emailCandidate : undefined,
      }
    },
    [actorProfiles]
  )

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'IP Address', 'User Agent', 'Details']
    const rows = auditLogs.map((log) => {
      const actor = resolveActorInfo(log)
      return [
        new Date(log.created_at).toISOString(),
        actor.name,
        log.action,
        log.entity_type,
        log.ip_address || '',
        log.user_agent || '',
        JSON.stringify(log.details || {}),
      ]
    })

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-trail-${manualId}-${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getActionBadge = (action: string) => {
    const badges = {
      INSERT: { color: 'bg-green-100 text-green-800', label: 'Created' },
      UPDATE: { color: 'bg-blue-100 text-blue-800', label: 'Updated' },
      DELETE: { color: 'bg-red-100 text-red-800', label: 'Deleted' },
    }
    return badges[action as keyof typeof badges] || { color: 'bg-gray-100 text-gray-800', label: action }
  }

  if (loading && auditLogs.length === 0) {
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
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Audit Trail
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Immutable log of all operations (indefinite retention)
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={auditLogs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => {
                setFilters({ ...filters, action: e.target.value })
                setPage(1)
              }}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="INSERT">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DELETE">Deleted</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={filters.entity_type}
              onChange={(e) => {
                setFilters({ ...filters, entity_type: e.target.value })
                setPage(1)
              }}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="manuals">Manuals</option>
              <option value="chapters">Chapters</option>
              <option value="content_blocks">Content Blocks</option>
              <option value="revisions">Revisions</option>
              <option value="user_profiles">Users</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => {
                setFilters({ ...filters, start_date: e.target.value })
                setPage(1)
              }}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => {
                setFilters({ ...filters, end_date: e.target.value })
                setPage(1)
              }}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {auditLogs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log) => {
                  const actionBadge = getActionBadge(log.action)
                  const actor = resolveActorInfo(log)
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {actor.name}
                            </p>
                            {actor.email && (
                              <p className="text-xs text-gray-500">{actor.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${actionBadge.color}`}
                        >
                          {actionBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">{log.entity_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:text-blue-800">
                            View Details
                          </summary>
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono max-w-md overflow-auto">
                            {log.details ? (
                              <pre>{JSON.stringify(log.details, null, 2)}</pre>
                            ) : (
                              <p className="text-gray-500 italic">No details</p>
                            )}
                            {log.ip_address && (
                              <div className="mt-2 pt-2 border-t">
                                <strong>IP:</strong> {log.ip_address}
                              </div>
                            )}
                            {log.user_agent && (
                              <div className="mt-1">
                                <strong>User Agent:</strong> {log.user_agent}
                              </div>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
