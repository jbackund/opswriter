'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import GlobalSearch from './GlobalSearch'
import { User } from 'lucide-react'

export default function DashboardHeader() {
  const [userEmail, setUserEmail] = useState<string>('')
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    const supabase = createClient()
    const fetchUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || '')

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserName(profile.full_name || user.email || '')
        }
      }
    }

    fetchUserInfo()
  }, [])

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center gap-4">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-right">
              <div className="font-medium text-gray-900">{userName}</div>
              <div className="text-gray-500">{userEmail}</div>
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
