'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type ExportJobVariant = 'draft_watermarked' | 'draft_diff' | 'clean_approved'

export interface ExportJobFilters {
  status?: ExportJobStatus
  variant?: ExportJobVariant
  createdBy?: string
  manualId?: string
  fromDate?: string
  toDate?: string
  search?: string
}

export interface ExportJobRecord {
  id: string
  manual_id: string
  revision_id: string | null
  variant: ExportJobVariant
  status: ExportJobStatus
  file_path: string | null
  file_url: string | null
  file_size_bytes?: number | null
  error_message: string | null
  expires_at: string | null
  processing_started_at: string | null
  processing_completed_at: string | null
  created_at: string
  created_by: string
  manual?: {
    id: string
    title: string
    manual_code: string
    status: string
    current_revision: string
  } | null
  requester?: {
    id: string
    full_name: string | null
    email: string | null
    role: string | null
  } | null
}

export const exportJobKeys = {
  all: ['export-jobs'] as const,
  lists: () => [...exportJobKeys.all, 'list'] as const,
  list: (filters?: ExportJobFilters) => [...exportJobKeys.lists(), filters] as const,
}

export function useExportJobs(filters?: ExportJobFilters, initialData?: ExportJobRecord[]) {
  const supabase = createClient()

  return useQuery({
    queryKey: exportJobKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('export_jobs')
        .select(
          `*,
          manual:manuals!export_jobs_manual_id_fkey(
            id,
            title,
            manual_code,
            status,
            current_revision
          )`
        )
        .order('created_at', { ascending: false })
        .limit(200)

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.variant) {
        query = query.eq('variant', filters.variant)
      }

      if (filters?.createdBy) {
        query = query.eq('created_by', filters.createdBy)
      }

      if (filters?.manualId) {
        query = query.eq('manual_id', filters.manualId)
      }

      if (filters?.fromDate) {
        query = query.gte('created_at', filters.fromDate)
      }

      if (filters?.toDate) {
        query = query.lte('created_at', filters.toDate)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      let jobs = (data || []) as ExportJobRecord[]

      const requesterIds = Array.from(new Set(jobs.map(job => job.created_by))).filter(
        Boolean
      ) as string[]

      if (requesterIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, role')
          .in('id', requesterIds)

        if (profilesError) {
          throw profilesError
        }

        const profileMap = new Map(
          (profiles || []).map(profile => [profile.id, profile])
        )

        jobs = jobs.map(job => ({
          ...job,
          requester: profileMap.get(job.created_by) || null,
        }))
      }

      if (filters?.search) {
        const needle = filters.search.toLowerCase()
        jobs = jobs.filter(job => {
          const manualTitle = job.manual?.title?.toLowerCase() || ''
          const manualCode = job.manual?.manual_code?.toLowerCase() || ''
          const requesterName = job.requester?.full_name?.toLowerCase() || ''
          const requesterEmail = job.requester?.email?.toLowerCase() || ''

          return (
            manualTitle.includes(needle) ||
            manualCode.includes(needle) ||
            requesterName.includes(needle) ||
            requesterEmail.includes(needle)
          )
        })
      }

      return jobs
    },
    staleTime: 15 * 1000,
    initialData,
  })
}
