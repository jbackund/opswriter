'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import {
  Clock,
  Edit,
  Send,
  CheckCircle,
  XCircle,
  User,
  FileText,
  AlertCircle,
  Archive
} from 'lucide-react'

interface Activity {
  id: string
  action: string
  entity_type: string
  entity_id: string
  actor_id: string
  created_at: string
  metadata: any
  user?: {
    full_name: string
    email: string
  }
}

interface ActivityFeedProps {
  manualId: string
  limit?: number
  showHeader?: boolean
}

export default function ActivityFeed({
  manualId,
  limit = 10,
  showHeader = true
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        // Fetch activities from audit_logs with actor information
        const { data, error: fetchError } = await supabase
          .from('audit_logs')
          .select(`
            id,
            action,
            entity_type,
            entity_id,
            actor_id,
            created_at,
            metadata,
            user:user_profiles!audit_logs_user_id_fkey(
              full_name,
              email
            )
          `)
          .eq('entity_id', manualId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (fetchError) {
          throw fetchError
        }

        setActivities(data || [])
      } catch (err) {
        console.error('Failed to fetch activities:', err)
        setError('Failed to load activity feed')
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()

    // Set up real-time subscription for new activities
    const supabase = createClient()
    const channel = supabase
      .channel(`activity-feed-${manualId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `entity_id=eq.${manualId}`,
        },
        (payload) => {
          // Fetch the new activity with actor information
          fetchActivityWithActor(payload.new.id)
        }
      )
      .subscribe()

    const fetchActivityWithActor = async (activityId: string) => {
      const { data } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          actor_id,
          created_at,
          metadata,
          actor:user_profiles!audit_logs_actor_id_fkey(
            full_name,
            email
          )
        `)
        .eq('id', activityId)
        .single()

      if (data) {
        setActivities(prev => [data, ...prev].slice(0, limit))
      }
    }

    return () => {
      channel.unsubscribe()
    }
  }, [manualId, limit])

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <FileText className="h-5 w-5 text-green-500" />
      case 'updated':
      case 'edited':
        return <Edit className="h-5 w-5 text-blue-500" />
      case 'status_change':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'submitted_for_review':
        return <Send className="h-5 w-5 text-indigo-500" />
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'restored':
        return <Archive className="h-5 w-5 text-purple-500" />
      case 'notification_sent':
        return <Send className="h-5 w-5 text-blue-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getActivityMessage = (activity: Activity) => {
    const actorName = activity.user?.full_name || activity.user?.email || 'Unknown user'
    const metadata = activity.metadata || {}

    switch (activity.action) {
      case 'created':
        return `${actorName} created the manual`
      case 'updated':
        return `${actorName} updated ${metadata.field || 'the manual'}`
      case 'status_change':
        return `${actorName} changed status from ${metadata.from_status} to ${metadata.to_status}`
      case 'submitted_for_review':
        return `${actorName} submitted revision ${metadata.revision_number} for review`
      case 'approved':
        return `${actorName} approved revision ${metadata.revision_number}`
      case 'rejected':
        return `${actorName} rejected revision ${metadata.revision_number}${
          metadata.reason ? `: "${metadata.reason}"` : ''
        }`
      case 'restored':
        return `${actorName} restored from revision ${metadata.revision_number}`
      case 'chapter_added':
        return `${actorName} added chapter ${metadata.chapter_number}: ${metadata.chapter_title}`
      case 'chapter_removed':
        return `${actorName} removed chapter ${metadata.chapter_number}`
      case 'chapter_updated':
        return `${actorName} updated chapter ${metadata.chapter_number}`
      case 'notification_sent':
        return `${actorName} sent ${metadata.type} notification to ${
          metadata.recipients?.length || 0
        } recipient(s)`
      default:
        return `${actorName} performed ${activity.action}`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </h3>
      )}

      <div className="flow-root">
        <ul className="-mb-8">
          {activities.map((activity, index) => (
            <li key={activity.id}>
              <div className="relative pb-8">
                {index !== activities.length - 1 && (
                  <span
                    className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      {getActivityIcon(activity.action)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div>
                      <p className="text-sm text-gray-900">
                        {getActivityMessage(activity)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}