import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ManualsList from '@/components/ManualsList'

export default async function ManualsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let canDeleteManuals = false
  if (user) {
    const { data: currentProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching current user profile:', profileError)
    }

    if (currentProfile?.role === 'sysadmin') {
      canDeleteManuals = true
    }
  }

  // Get all manuals
  const { data: manuals, error } = await supabase
    .from('manuals')
    .select('*')
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching manuals:', error)
  }

  // Get user profiles for all manual creators
  let enrichedManuals = manuals || []
  if (manuals && manuals.length > 0) {
    const userIds = [...new Set(manuals.map(m => m.created_by))]
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds)

    if (profiles) {
      const profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]))
      enrichedManuals = manuals.map(manual => ({
        ...manual,
        created_by_user: profilesMap[manual.created_by] || { full_name: 'Unknown', email: '' }
      }))
    }

    const manualIds = manuals.map(m => m.id)
    const { data: activeRevisions, error: revisionsError } = await supabase
      .from('revisions')
      .select('manual_id, revision_number, status, created_at')
      .in('manual_id', manualIds)
      .in('status', ['draft', 'in_review'])
      .order('created_at', { ascending: false })

    if (revisionsError) {
      console.error('Error fetching active revision numbers:', revisionsError)
    }

    const activeRevisionMap = new Map<string, { revision_number: string; status: string }>()

    if (activeRevisions) {
      for (const rev of activeRevisions) {
        if (!activeRevisionMap.has(rev.manual_id)) {
          activeRevisionMap.set(rev.manual_id, {
            revision_number: rev.revision_number,
            status: rev.status,
          })
        }
      }
    }

    enrichedManuals = enrichedManuals.map(manual => {
      const activeRevision = activeRevisionMap.get(manual.id)
      if (!activeRevision) {
        return manual
      }

      return {
        ...manual,
        current_revision: activeRevision.revision_number,
      }
    })
  }

  return (
    <div className="p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">Manuals</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all operational manuals in your organization
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            href="/dashboard/manuals/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-docgen-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-docgen-blue focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Manual
          </Link>
        </div>
      </div>

      <ManualsList initialManuals={enrichedManuals} canDelete={canDeleteManuals} />
    </div>
  )
}
