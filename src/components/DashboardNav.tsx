'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Book,
  FileText,
  Settings,
  Users,
  LogOut,
  Home,
  BookOpen,
  FileCheck
} from 'lucide-react'

export default function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userRole, setUserRole] = useState<string>('manager')

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserRole(profile.role)
        }
      }
    }

    fetchUserRole()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, requiresAdmin: false },
    { name: 'Manuals', href: '/dashboard/manuals', icon: Book, requiresAdmin: false },
    { name: 'Definitions', href: '/dashboard/definitions', icon: BookOpen, requiresAdmin: false },
    { name: 'Abbreviations', href: '/dashboard/abbreviations', icon: FileCheck, requiresAdmin: false },
    { name: 'Export Jobs', href: '/dashboard/exports', icon: FileText, requiresAdmin: false },
    { name: 'Users', href: '/dashboard/users', icon: Users, requiresAdmin: true },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, requiresAdmin: false },
  ].filter(item => !item.requiresAdmin || userRole === 'sysadmin')

  return (
    <nav className="w-64 bg-white shadow-lg">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-16 border-b">
          <h1 className="text-xl font-bold text-docgen-blue">OPSWriter</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ul className="p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                      isActive
                        ? 'bg-docgen-blue text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="border-t p-4">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3 py-2 w-full rounded-lg text-gray-700 hover:bg-gray-100 transition"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  )
}