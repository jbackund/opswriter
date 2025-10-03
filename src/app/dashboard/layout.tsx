import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/DashboardNav'
import DashboardHeader from '@/components/DashboardHeader'
import SessionTimeoutProvider from '@/components/SessionTimeoutProvider'

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

  return (
    <SessionTimeoutProvider>
      <div className="min-h-screen flex">
        <DashboardNav />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 bg-gray-50">{children}</main>
        </div>
      </div>
    </SessionTimeoutProvider>
  )
}