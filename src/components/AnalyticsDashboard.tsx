'use client'

import { useState, useMemo } from 'react'
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Calendar,
  AlertCircle,
  Eye,
  Edit,
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalManuals: number
    manualsInReview: number
    approvedManuals: number
    draftManuals: number
  }
  revisions: {
    recent: any[]
    avgReviewTimeMs: number
    totalLast30Days: number
  }
  exports: {
    totalLast30Days: number
    successfulLast30Days: number
    successRate: number
  }
  users: {
    activeUsersLast30Days: number
  }
  activity: {
    recent: any[]
  }
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ElementType
  color: string
  trend?: 'up' | 'down' | 'neutral'
}

function MetricCard({ title, value, change, icon: Icon, color, trend }: MetricCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500 mr-1" />}
              {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500 mr-1" />}
              <span
                className={`text-sm ${
                  trend === 'up'
                    ? 'text-green-600'
                    : trend === 'down'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {change > 0 ? '+' : ''}{change}% from last month
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )
}

function ActivityItem({ activity }: { activity: any }) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
      case 'create':
        return <Plus className="h-4 w-4" />
      case 'updated':
      case 'update':
        return <Edit className="h-4 w-4" />
      case 'deleted':
      case 'delete':
        return <XCircle className="h-4 w-4" />
      case 'exported':
        return <Download className="h-4 w-4" />
      case 'viewed':
        return <Eye className="h-4 w-4" />
      case 'status_change':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diff = now.getTime() - then.getTime()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  return (
    <div className="flex items-start space-x-3 py-3 border-b last:border-0">
      <div className="p-1.5 rounded-full bg-gray-100">
        {getActionIcon(activity.action)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{activity.actor?.full_name || 'System'}</span>
          {' '}
          {activity.action.replace('_', ' ')}
          {' '}
          <span className="text-gray-600">{activity.entity_type}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatTimeAgo(activity.performed_at)}
        </p>
      </div>
    </div>
  )
}

function SimpleBarChart({ data, title }: { data: any[]; title: string }) {
  const maxValue = Math.max(...data.map(d => d.value))

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalyticsDashboard({ initialData }: { initialData: AnalyticsData }) {
  const [dateRange, setDateRange] = useState('30days')
  const [activeTab, setActiveTab] = useState('overview')

  // Calculate metrics
  const formatReviewTime = (ms: number) => {
    if (ms === 0) return 'N/A'
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }

  // Manual status breakdown data
  const manualStatusData = [
    { label: 'Draft', value: initialData.overview.draftManuals },
    { label: 'In Review', value: initialData.overview.manualsInReview },
    { label: 'Approved', value: initialData.overview.approvedManuals },
  ]

  // Revision activity by day (last 7 days)
  const revisionsByDay = useMemo(() => {
    const days = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStr = date.toISOString().split('T')[0]
      const count = initialData.revisions.recent.filter(r => {
        const revDate = new Date(r.created_at).toISOString().split('T')[0]
        return revDate === dayStr
      }).length

      days.push({
        label: date.toLocaleDateString('en', { weekday: 'short' }),
        value: count,
      })
    }

    return days
  }, [initialData.revisions.recent])

  return (
    <div>
      {/* Date Range Selector */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'activity'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Reports
          </button>
        </div>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
        >
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="90days">Last 90 days</option>
        </select>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Manuals"
              value={initialData.overview.totalManuals}
              icon={FileText}
              color="bg-blue-500"
            />
            <MetricCard
              title="Awaiting Review"
              value={initialData.overview.manualsInReview}
              icon={Clock}
              color="bg-yellow-500"
            />
            <MetricCard
              title="Export Success Rate"
              value={`${initialData.exports.successRate.toFixed(1)}%`}
              icon={Download}
              color="bg-green-500"
              trend={initialData.exports.successRate > 95 ? 'up' : 'down'}
            />
            <MetricCard
              title="Active Users"
              value={initialData.users.activeUsersLast30Days}
              icon={Users}
              color="bg-purple-500"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SimpleBarChart
              data={manualStatusData}
              title="Manual Status Distribution"
            />
            <SimpleBarChart
              data={revisionsByDay}
              title="Revision Activity (Last 7 Days)"
            />
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Review Metrics</h3>
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg. Review Time</span>
                  <span className="text-sm font-medium">
                    {formatReviewTime(initialData.revisions.avgReviewTimeMs)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Revisions (30d)</span>
                  <span className="text-sm font-medium">
                    {initialData.revisions.totalLast30Days}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Approval Rate</span>
                  <span className="text-sm font-medium">
                    {initialData.overview.approvedManuals > 0
                      ? `${((initialData.overview.approvedManuals / initialData.overview.totalManuals) * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Export Metrics</h3>
                <Download className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Exports (30d)</span>
                  <span className="text-sm font-medium">
                    {initialData.exports.totalLast30Days}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Successful</span>
                  <span className="text-sm font-medium text-green-600">
                    {initialData.exports.successfulLast30Days}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Failed</span>
                  <span className="text-sm font-medium text-red-600">
                    {initialData.exports.totalLast30Days - initialData.exports.successfulLast30Days}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database Status</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Healthy
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Storage Usage</span>
                  <span className="text-sm font-medium">23.5 GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Response</span>
                  <span className="text-sm font-medium">124ms</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-sm text-gray-600 mt-1">Latest system events and user actions</p>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {initialData.activity.recent.map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
              <FileText className="h-6 w-6 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">Audit Log Export</h4>
              <p className="text-sm text-gray-600 mt-1">
                Export complete audit trail for compliance review
              </p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
              <BarChart3 className="h-6 w-6 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">Usage Report</h4>
              <p className="text-sm text-gray-600 mt-1">
                Detailed analytics for the selected period
              </p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
              <Users className="h-6 w-6 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">User Activity Report</h4>
              <p className="text-sm text-gray-600 mt-1">
                Individual user actions and contributions
              </p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
              <CheckCircle className="h-6 w-6 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">Compliance Report</h4>
              <p className="text-sm text-gray-600 mt-1">
                Regulatory compliance summary and metrics
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper component for missing imports
function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}