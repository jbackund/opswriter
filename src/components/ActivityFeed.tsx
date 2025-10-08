'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import {
  Clock,
  Edit,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  Archive,
} from 'lucide-react'

interface Activity {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  manual_id: string | null
  actor_id: string | null
  actor_email: string | null
  created_at: string
  details: any
  user?: {
    full_name: string | null
    email: string | null
  } | null
}

interface ActivityFeedProps {
  manualId: string
  limit?: number
  showHeader?: boolean
}

interface ActorProfile {
  full_name: string | null
  email: string | null
}

export default function ActivityFeed({
  manualId,
  limit = 10,
  showHeader = true,
}: ActivityFeedProps) {
  const supabase = useMemo(() => createClient(), [])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actorProfiles, setActorProfiles] = useState<Record<string, ActorProfile>>({})
  const profilesRef = useRef<Record<string, ActorProfile>>({})

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
        console.error('Failed to load actor profiles:', profileError)
        return
      }

      if (!data) {
        return
      }

      setActorProfiles(prev => {
        const next = { ...prev }
        data.forEach(profile => {
          next[profile.id] = {
            full_name: profile.full_name,
            email: profile.email,
          }
        })
        profilesRef.current = next
        return next
      })
    },
    [supabase]
  )

  useEffect(() => {
    let isMounted = true

    profilesRef.current = {}
    setActorProfiles({})

    const fetchActivities = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/manuals/${manualId}/audit-logs?limit=${limit}`)

        if (!response.ok) {
          throw new Error('Failed to fetch activities')
        }

        const payload = await response.json()
        const fetchedActivities = (payload.audit_logs || []).map((item: any) => ({
          ...item,
          details: item.details ?? item.metadata ?? null,
        })) as Activity[]

        if (isMounted) {
          setActivities(fetchedActivities)
        }

        await loadActorProfiles(fetchedActivities.map(activity => activity.actor_id))
      } catch (err) {
        console.error('Failed to fetch activities:', err)
        if (isMounted) {
          setError('Failed to load activity feed')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchActivities()

    const fetchActivityWithActor = async (activityId: string) => {
      try {
        const response = await fetch(`/api/manuals/${manualId}/audit-logs?activityId=${activityId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch activity details')
        }

        const payload = await response.json()
        const data = Array.isArray(payload.audit_logs) ? payload.audit_logs[0] : payload.audit_logs

        if (!data) {
          return
        }

        await loadActorProfiles([data.actor_id])

        setActivities(prev => {
          const existingIndex = prev.findIndex(activity => activity.id === data.id)
          if (existingIndex !== -1) {
            const next = [...prev]
            next[existingIndex] = {
              ...next[existingIndex],
              ...data,
              details: data.details ?? data.metadata ?? null,
            }
            return next
          }
          const hydrated = {
            ...data,
            details: data.details ?? data.metadata ?? null,
          } as Activity
          return [hydrated, ...prev].slice(0, limit)
        })
      } catch (activityError) {
        console.error('Failed to fetch real-time activity:', activityError)
      }
    }

    const channel = supabase
      .channel(`activity-feed-${manualId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `manual_id=eq.${manualId}`,
        },
        payload => {
          fetchActivityWithActor(payload.new.id)
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      channel.unsubscribe()
    }
  }, [manualId, limit, loadActorProfiles, supabase])

  const resolveActorName = (activity: Activity) => {
    if (activity.actor_id) {
      const profile = actorProfiles[activity.actor_id]
      if (profile?.full_name) {
        return profile.full_name
      }
      if (profile?.email) {
        return profile.email
      }
    }

    const joinedProfile = activity.user
    if (joinedProfile?.full_name) {
      return joinedProfile.full_name
    }
    if (joinedProfile?.email) {
      return joinedProfile.email
    }

    if (activity.actor_email) {
      return activity.actor_email
    }

    if (typeof activity.details?.actor_email === 'string') {
      return activity.details.actor_email
    }

    return 'Unknown user'
  }

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
    const actorName = resolveActorName(activity)
    const details = activity.details || {}
    const newPayload = details.new ?? null
    const oldPayload = details.old ?? null
    const entityType = activity.entity_type

    const getChapterIdentifier = (payload: any) => {
      if (!payload) {
        return null
      }
      const parts: Array<number> = []
      if (typeof payload.chapter_number === 'number') parts.push(payload.chapter_number)
      if (typeof payload.section_number === 'number') parts.push(payload.section_number)
      if (typeof payload.subsection_number === 'number') parts.push(payload.subsection_number)
      if (typeof payload.clause_number === 'number') parts.push(payload.clause_number)
      const heading = typeof payload.heading === 'string' ? payload.heading : ''
      const number = parts.length > 0 ? parts.join('.') : null
      return { heading, number }
    }

    const chapterInfo = getChapterIdentifier(newPayload || oldPayload)
    const chapterLabel = chapterInfo
      ? `${chapterInfo.number ? `${chapterInfo.number} ` : ''}${chapterInfo.heading || ''}`.trim()
      : null

    switch (activity.action) {
      case 'created':
        if (entityType === 'chapters' && chapterLabel) {
          return `${actorName} created chapter ${chapterLabel}`
        }
        if (entityType === 'manuals' && newPayload?.title) {
          return `${actorName} created manual "${newPayload.title}"`
        }
        return `${actorName} created ${entityType}`
      case 'updated':
        if (entityType === 'chapters' && chapterLabel) {
          return `${actorName} updated chapter ${chapterLabel}`
        }
        if (entityType === 'manuals') {
          return `${actorName} updated the manual`
        }
        return `${actorName} updated ${entityType}`
      case 'status_change':
        return `${actorName} changed status from ${details.from_status} to ${details.to_status}`
      case 'submitted_for_review':
        return `${actorName} submitted revision ${details.revision_number} for review`
      case 'approved':
        return `${actorName} approved revision ${details.revision_number}`
      case 'rejected':
        return `${actorName} rejected revision ${details.revision_number}${
          details.reason ? `: "${details.reason}"` : ''
        }`
      case 'restored':
        return `${actorName} restored from revision ${details.revision_number}`
      case 'chapter_added':
        return `${actorName} added chapter ${details.chapter_number}: ${details.chapter_title}`
      case 'chapter_removed':
        return `${actorName} removed chapter ${details.chapter_number}`
      case 'chapter_updated':
        return `${actorName} updated chapter ${details.chapter_number}`
      case 'notification_sent':
        return `${actorName} sent ${details.type} notification to ${
          details.recipients?.length || 0
        } recipient(s)`
      default:
        if (chapterLabel) {
          return `${actorName} ${activity.action} chapter ${chapterLabel}`
        }
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
      <div className="py-8 text-center">
        <Clock className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
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
                      <p className="text-sm text-gray-900">{getActivityMessage(activity)}</p>
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
