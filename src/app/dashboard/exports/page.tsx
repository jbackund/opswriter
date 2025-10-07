import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExportJobsManager from '@/components/ExportJobsManager'

export default async function ExportJobsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <ExportJobsManager
          currentUserId={user.id}
          currentUserRole={(profile?.role as 'manager' | 'sysadmin') || 'manager'}
        />
      </div>
    </div>
  )
}
