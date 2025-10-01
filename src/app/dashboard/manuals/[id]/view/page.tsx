import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManualEditor from '@/components/ManualEditor'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ViewManualPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get the manual with all related data
  const {
    data: manual,
    error: manualError,
  } = await supabase
    .from('manuals')
    .select(`
      *,
      chapters(*)
    `)
    .eq('id', id)
    .single()

  if (manualError || !manual) {
    console.error('Failed to load manual for viewing', manualError)
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

  // Check if user has permission to view
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // For now, any authenticated user can view manuals
  // You can add more specific permission checks here if needed

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Pass readOnly prop to ManualEditor for view mode */}
      <ManualEditor manual={manualWithRelations} userId={user.id} readOnly />
    </div>
  )
}
