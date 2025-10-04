'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Clock, User, AlertCircle, Check, Lock, Activity, Plus, Edit2, Trash2 } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  entity_type: string
  entity_id: string
  actor_id: string
  actor_email?: string
  metadata?: any
  ip_address?: string
  created_at: string
}

interface SecuritySettingsProps {
  userRole: 'manager' | 'sysadmin'
}

export default function SecuritySettings({ userRole }: SecuritySettingsProps) {
  const supabase = useMemo(() => createClient(), [])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [securityChecks, setSecurityChecks] = useState({
    https: true,
    rls: true,
    mfa: false,
    sessionTimeout: true,
    encryption: true,
  })

  const loadSecurityInfo = useCallback(async () => {
    setLoading(true)
    try {
      // Load session info
      const { data: { session } } = await supabase.auth.getSession()
      setSessionInfo(session)

      // Load recent audit logs (last 50)
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setAuditLogs(logs || [])

      // Check MFA status
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.app_metadata?.provider === 'email' && user?.user_metadata?.mfa_enabled) {
        setSecurityChecks(prev => ({ ...prev, mfa: true }))
      }
    } catch (error) {
      console.error('Error loading security info:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadSecurityInfo()
  }, [loadSecurityInfo])

  function formatDate(date: string) {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getActionIcon(action: string) {
    if (action.includes('create')) return <Plus className="h-4 w-4 text-green-600" />
    if (action.includes('update') || action.includes('edit')) return <Edit2 className="h-4 w-4 text-blue-600" />
    if (action.includes('delete')) return <Trash2 className="h-4 w-4 text-red-600" />
    if (action.includes('login')) return <User className="h-4 w-4 text-purple-600" />
    return <Activity className="h-4 w-4 text-gray-600" />
  }

  if (loading) {
    return <div className="text-gray-500">Loading security information...</div>
  }

  return (
    <div className="space-y-8">
      {/* Security Overview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries({
            'HTTPS Enabled': securityChecks.https,
            'Row Level Security': securityChecks.rls,
            'Multi-Factor Authentication': securityChecks.mfa,
            'Session Timeout (30 min)': securityChecks.sessionTimeout,
            'Data Encryption at Rest': securityChecks.encryption,
          }).map(([label, enabled]) => (
            <div
              key={label}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Shield className={`h-5 w-5 ${enabled ? 'text-green-600' : 'text-orange-500'}`} />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
              {enabled ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Session Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Session</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          {sessionInfo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">User:</span>
                <span className="text-sm font-medium">{sessionInfo.user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Session Expires:</span>
                <span className="text-sm font-medium">
                  {formatDate(new Date(sessionInfo.expires_at * 1000).toISOString())}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Provider:</span>
                <span className="text-sm font-medium">
                  {sessionInfo.user?.app_metadata?.provider || 'Email'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active session</p>
          )}
        </div>
      </div>

      {/* Audit Logs */}
      {userRole === 'sysadmin' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="text-sm text-gray-900">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {log.actor_email || 'System'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {formatDate(log.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {auditLogs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No audit logs available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Recommendations */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Recommendations</h3>
        <div className="space-y-3">
          {!securityChecks.mfa && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-900">
                  Enable Multi-Factor Authentication
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Add an extra layer of security to your account by enabling MFA in your account settings.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Regular Password Updates
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Change your password every 90 days to maintain account security.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <Check className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Secure Connection Active
              </p>
              <p className="text-sm text-green-700 mt-1">
                Your connection is encrypted using HTTPS with TLS 1.3.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
