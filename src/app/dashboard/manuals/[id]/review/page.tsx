import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManualReviewActions from '@/components/ManualReviewActions'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ManualReviewPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: manual,
    error: manualError,
  } = await supabase
    .from('manuals')
    .select(
      `
        id,
        title,
        manual_code,
        status,
        current_revision,
        organization_name,
        effective_date,
        revisions (
          id,
          revision_number,
          status,
          created_at,
          submitted_by,
          submitted_for_review_at,
          changes_summary
        )
      `
    )
    .eq('id', id)
    .single()

  if (manualError || !manual) {
    notFound()
  }

  const activeRevision = manual.revisions?.find((rev: any) => rev.status === 'in_review')

  if (!activeRevision) {
    redirect(`/dashboard/manuals/${id}/view`)
  }

  let submittedByName: string | null = null
  if (activeRevision.submitted_by) {
    const { data: submittedBy } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', activeRevision.submitted_by)
      .single()

    submittedByName = submittedBy?.full_name || submittedBy?.email || null
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manual Review</h1>
        <p className="mt-2 text-sm text-gray-600">
          Approve or reject the current submission. Revision <strong>{activeRevision.revision_number}</strong>{' '}
          is pending review for <strong>{manual.title}</strong>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Manual Details</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Title</dt>
                <dd className="mt-1 text-sm text-gray-900">{manual.title}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Code</dt>
                <dd className="mt-1 text-sm text-gray-900">{manual.manual_code}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Organization</dt>
                <dd className="mt-1 text-sm text-gray-900">{manual.organization_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Current Revision</dt>
                <dd className="mt-1 text-sm text-gray-900">{manual.current_revision}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm capitalize text-gray-900">{manual.status.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Submitted For Review</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {activeRevision.submitted_for_review_at
                    ? new Date(activeRevision.submitted_for_review_at).toLocaleString()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Submitted By</dt>
                <dd className="mt-1 text-sm text-gray-900">{submittedByName || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Change Summary</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {activeRevision.changes_summary || 'No summary provided.'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="lg:col-span-1">
          <ManualReviewActions
            manualId={manual.id}
            revisionId={activeRevision.id}
            revisionNumber={activeRevision.revision_number}
          />
        </div>
      </div>
    </div>
  )
}
