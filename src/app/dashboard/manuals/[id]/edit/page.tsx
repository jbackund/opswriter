import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManualEditor from '@/components/ManualEditor'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditManualPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get the manual with all related data including revisions
  const {
    data: manual,
    error: manualError,
  } = await supabase
    .from('manuals')
    .select(`
      *,
      chapters(*),
      revisions(
        id,
        revision_number,
        status,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (manualError || !manual) {
    console.error('Failed to load manual for editing', manualError)
    notFound()
  }

  const {
    data: createdByProfile,
    error: createdByError,
  } = await supabase
    .from('user_profiles')
    .select('full_name, email')
    .eq('id', manual.created_by)
    .maybeSingle()

  if (createdByError) {
    console.error('Failed to load manual owner profile', createdByError)
  }

  const manualWithRelations = {
    ...manual,
    created_by_user:
      createdByProfile ?? {
        full_name: 'Unknown',
        email: '',
      },
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
  const manualStatus = typeof manual.status === 'string' ? manual.status.toLowerCase() : manual.status
  if (manualStatus !== 'draft' && manualStatus !== 'rejected') {
    redirect(`/dashboard/manuals/${id}/view`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ManualEditor manual={manualWithRelations} userId={user.id} />
    </div>
  )
}
