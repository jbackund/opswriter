import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/DashboardNav'
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
        <main className="flex-1 bg-gray-50">{children}</main>
      </div>
    </SessionTimeoutProvider>
  )
}