import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ManualsList from '@/components/ManualsList'

export default async function ManualsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let viewerRole: 'manager' | 'sysadmin' | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    viewerRole = profile?.role ?? null
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

      <ManualsList initialManuals={enrichedManuals} viewerRole={viewerRole} />
    </div>
  )
}
