'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Query keys for cache management
export const manualKeys = {
  all: ['manuals'] as const,
  lists: () => [...manualKeys.all, 'list'] as const,
  list: (filters?: any) => [...manualKeys.lists(), filters] as const,
  details: () => [...manualKeys.all, 'detail'] as const,
  detail: (id: string) => [...manualKeys.details(), id] as const,
  revisions: (id: string) => [...manualKeys.detail(id), 'revisions'] as const,
  chapters: (id: string) => [...manualKeys.detail(id), 'chapters'] as const,
}

interface Manual {
  id: string
  title: string
  description: string
  manual_code: string
  status: string
  current_revision: string
  effective_date: string | null
  revision_date: string | null
  organization_name: string
  created_by: string
  created_at: string
  updated_at: string
  tags: string[] | null
}

interface ManualWithRelations extends Manual {
  chapters?: any[]
  revisions?: any[]
  created_by_user?: {
    full_name: string
    email: string
  }
}

// Hook to fetch list of manuals
export function useManuals(filters?: {
  status?: string
  owner?: string
  search?: string
}) {
  const supabase = createClient()

  return useQuery({
    queryKey: manualKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('manuals')
        .select(`
          *,
          created_by_user:user_profiles!created_by(
            full_name,
            email
          )
        `)
        .order('updated_at', { ascending: false })

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.owner) {
        query = query.eq('created_by', filters.owner)
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data as ManualWithRelations[]
    },
    // Keep list data fresh for 30 seconds
    staleTime: 30 * 1000,
  })
}

// Hook to fetch single manual with details
export function useManual(id: string, includeChapters = true) {
  const supabase = createClient()

  return useQuery({
    queryKey: manualKeys.detail(id),
    queryFn: async () => {
      let selectQuery = `
        *,
        created_by_user:user_profiles!created_by(
          full_name,
          email
        ),
        revisions(
          id,
          revision_number,
          status,
          created_at
        )
      `

      if (includeChapters) {
        selectQuery += `,
        chapters(
          *,
          content_blocks(*),
          chapter_remarks(*)
        )`
      }

      const { data, error } = await supabase
        .from('manuals')
        .select(selectQuery)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as ManualWithRelations
    },
    // Cache manual details for 2 minutes
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  })
}

// Hook to create a new manual
export function useCreateManual() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (newManual: Partial<Manual>) => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('manuals')
        .insert({
          ...newManual,
          created_by: user.user.id,
          status: 'draft',
          current_revision: '0',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate and refetch manuals list
      queryClient.invalidateQueries({ queryKey: manualKeys.lists() })
      // Navigate to the new manual
      router.push(`/dashboard/manuals/${data.id}/edit`)
    },
  })
}

// Hook to update a manual
export function useUpdateManual(id: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<Manual>) => {
      const { data, error } = await supabase
        .from('manuals')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: manualKeys.detail(id) })

      // Snapshot the previous value
      const previousManual = queryClient.getQueryData(manualKeys.detail(id))

      // Optimistically update to the new value
      queryClient.setQueryData(manualKeys.detail(id), (old: any) => ({
        ...old,
        ...updates,
      }))

      return { previousManual }
    },
    onError: (err, updates, context) => {
      // Rollback on error
      if (context?.previousManual) {
        queryClient.setQueryData(manualKeys.detail(id), context.previousManual)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: manualKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: manualKeys.lists() })
    },
  })
}

// Hook to delete a manual
export function useDeleteManual() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('manuals')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: manualKeys.detail(id) })
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: manualKeys.lists() })
      // Navigate back to list
      router.push('/dashboard/manuals')
    },
  })
}

// Hook for manual revisions with pagination
export function useManualRevisions(manualId: string, page = 0, limit = 10) {
  const supabase = createClient()

  return useQuery({
    queryKey: [...manualKeys.revisions(manualId), page, limit],
    queryFn: async () => {
      const from = page * limit
      const to = from + limit - 1

      const { data, error, count } = await supabase
        .from('revisions')
        .select('*', { count: 'exact' })
        .eq('manual_id', manualId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      return {
        revisions: data,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      }
    },
    enabled: !!manualId,
    staleTime: 60 * 1000, // Cache for 1 minute
  })
}

// Hook to prefetch manual data
export function usePrefetchManual(id: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return () => {
    queryClient.prefetchQuery({
      queryKey: manualKeys.detail(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('manuals')
          .select(`
            *,
            created_by_user:user_profiles!created_by(
              full_name,
              email
            ),
            chapters(
              *,
              content_blocks(*),
              chapter_remarks(*)
            ),
            revisions(
              id,
              revision_number,
              status,
              created_at
            )
          `)
          .eq('id', id)
          .single()

        if (error) throw error
        return data
      },
      staleTime: 2 * 60 * 1000,
    })
  }
}
