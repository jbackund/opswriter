import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManualEditor from '@/components/ManualEditor'

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditManualPage({ params }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get the manual with all related data
  const { data: manual, error } = await supabase
    .from('manuals')
    .select(`
      *,
      created_by_user:user_profiles!manuals_created_by_fkey(full_name, email),
      chapters(*)
    `)
    .eq('id', params.id)
    .single()

  if (error || !manual) {
    notFound()
  }

  // Check if user has permission to edit
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Users can only edit their own manuals unless they're SysAdmin
  if (manual.created_by !== user.id && userProfile?.role !== 'sysadmin') {
    redirect('/dashboard/manuals')
  }

  // Check if manual is editable (draft or rejected status)
  if (manual.status !== 'draft' && manual.status !== 'rejected') {
    redirect(`/dashboard/manuals/${params.id}/view`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ManualEditor manual={manual} userId={user.id} />
    </div>
  )
}