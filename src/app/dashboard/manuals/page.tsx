import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ManualsList from '@/components/ManualsList'

export default async function ManualsPage() {
  const supabase = await createClient()

  // Get all manuals with user info
  const { data: manuals } = await supabase
    .from('manuals')
    .select(`
      *,
      created_by_user:user_profiles!manuals_created_by_fkey(full_name, email)
    `)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

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

      <ManualsList initialManuals={manuals || []} />
    </div>
  )
}