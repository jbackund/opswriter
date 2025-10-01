import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManualForm from '@/components/ManualForm'

interface PageProps {
  searchParams?: Promise<{
    clone?: string
    title?: string
    code?: string
  }>
}

export default async function NewManualPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile for owner info
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If cloning, get the source manual and its chapters
  let sourceManual = null
  let sourceChapters = null
  if (params?.clone) {
    const { data: manual } = await supabase
      .from('manuals')
      .select('*')
      .eq('id', params.clone)
      .single()

    if (manual) {
      sourceManual = manual

      const { data: chapters } = await supabase
        .from('chapters')
        .select('*')
        .eq('manual_id', manual.id)
        .order('display_order')

      sourceChapters = chapters
    }
  }

  const isCloning = !!sourceManual

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isCloning ? 'Clone Manual' : 'Create New Manual'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isCloning
              ? `Creating a new manual based on "${sourceManual.title}". The chapter structure will be copied but content will be empty.`
              : 'Fill in the details below to create a new operational manual. All fields marked with * are required.'}
          </p>
        </div>

        <ManualForm
          userProfile={userProfile}
          sourceManual={sourceManual}
          sourceChapters={sourceChapters}
          cloneTitle={params?.title}
          cloneCode={params?.code}
        />
      </div>
    </div>
  )
}