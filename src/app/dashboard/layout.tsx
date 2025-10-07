import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/DashboardNav'
import DashboardHeader from '@/components/DashboardHeader'
import SessionTimeoutProvider from '@/components/SessionTimeoutProvider'
import { ReactQueryProvider } from '@/lib/react-query/provider'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) {
    await supabase.auth.signOut()
    const message = encodeURIComponent(
      'Your account is pending sysadmin approval. Please contact your system administrator.'
    )
    redirect(`/login?message=${message}`)
  }

  return (
    <ReactQueryProvider>
      <SessionTimeoutProvider>
        <div className="min-h-screen flex">
          <DashboardNav />
          <div className="flex-1 flex flex-col">
            <DashboardHeader />
            <main className="flex-1 bg-gray-50">{children}</main>
          </div>
        </div>
      </SessionTimeoutProvider>
    </ReactQueryProvider>
  )
}
