import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is SysAdmin
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userProfile?.role !== 'sysadmin') {
    redirect('/dashboard')
  }

  // Fetch initial analytics data
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Manual statistics
  const { data: manualStats } = await supabase
    .from('manuals')
    .select('status', { count: 'exact' })

  const { count: totalManuals } = await supabase
    .from('manuals')
    .select('*', { count: 'exact', head: true })

  const { count: manualsInReview } = await supabase
    .from('manuals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'in_review')

  const { count: approvedManuals } = await supabase
    .from('manuals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  const { count: draftManuals } = await supabase
    .from('manuals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft')

  // Revision statistics
  const { data: recentRevisions } = await supabase
    .from('revisions')
    .select('*')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  // Calculate average time in review
  const { data: reviewTimes } = await supabase
    .from('revisions')
    .select('submitted_for_review_at, approved_at, rejected_at')
    .not('submitted_for_review_at', 'is', null)
    .gte('created_at', ninetyDaysAgo.toISOString())

  let avgReviewTime = 0
  if (reviewTimes && reviewTimes.length > 0) {
    const reviewDurations = reviewTimes
      .filter(r => r.approved_at || r.rejected_at)
      .map(r => {
        const end = new Date(r.approved_at || r.rejected_at)
        const start = new Date(r.submitted_for_review_at)
        return end.getTime() - start.getTime()
      })

    if (reviewDurations.length > 0) {
      avgReviewTime = reviewDurations.reduce((a, b) => a + b, 0) / reviewDurations.length
    }
  }

  // Export statistics
  const { count: totalExports } = await supabase
    .from('export_jobs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString())

  const { count: successfulExports } = await supabase
    .from('export_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // User activity
  const { data: activeUsers } = await supabase
    .from('audit_logs')
    .select('actor_id', { count: 'exact' })
    .gte('performed_at', thirtyDaysAgo.toISOString())

  const uniqueActiveUsers = new Set(activeUsers?.map(a => a.actor_id)).size

  // Recent activity for timeline
  const { data: recentActivity } = await supabase
    .from('audit_logs')
    .select(`
      *,
      actor:user_profiles!actor_id(
        full_name,
        email
      )
    `)
    .order('performed_at', { ascending: false })
    .limit(50)

  // Compile analytics data
  const analyticsData = {
    overview: {
      totalManuals: totalManuals || 0,
      manualsInReview: manualsInReview || 0,
      approvedManuals: approvedManuals || 0,
      draftManuals: draftManuals || 0,
    },
    revisions: {
      recent: recentRevisions || [],
      avgReviewTimeMs: avgReviewTime,
      totalLast30Days: recentRevisions?.length || 0,
    },
    exports: {
      totalLast30Days: totalExports || 0,
      successfulLast30Days: successfulExports || 0,
      successRate: totalExports ? ((successfulExports || 0) / totalExports) * 100 : 0,
    },
    users: {
      activeUsersLast30Days: uniqueActiveUsers,
    },
    activity: {
      recent: recentActivity || [],
    },
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h1>
          <p className="text-gray-600">System metrics and key performance indicators</p>
        </div>

        <AnalyticsDashboard initialData={analyticsData} />
      </div>
    </div>
  )
}