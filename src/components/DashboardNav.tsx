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
  FileCheck,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export default function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string>('manager')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const supabaseClient = createClient()
    const fetchUserRole = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (user) {
        const { data: profile } = await supabaseClient
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('dashboard-nav-collapsed')
    if (stored === 'true') {
      setCollapsed(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('dashboard-nav-collapsed', collapsed ? 'true' : 'false')
  }, [collapsed])

  const handleLogout = async () => {
    const supabaseClient = createClient()
    await supabaseClient.auth.signOut()
    router.push('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, requiresAdmin: false },
    { name: 'Manuals', href: '/dashboard/manuals', icon: Book, requiresAdmin: false },
    { name: 'Definitions', href: '/dashboard/definitions', icon: BookOpen, requiresAdmin: false },
    { name: 'Abbreviations', href: '/dashboard/abbreviations', icon: FileCheck, requiresAdmin: false },
    { name: 'Export Jobs', href: '/dashboard/exports', icon: FileText, requiresAdmin: false },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, requiresAdmin: false },
    { name: 'Users', href: '/dashboard/users', icon: Users, requiresAdmin: true },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, requiresAdmin: false },
  ].filter(item => !item.requiresAdmin || userRole === 'sysadmin')

  return (
    <nav className="bg-white shadow-lg transition-all duration-200">
      <div className="flex h-full">
        <div
          className={`flex flex-col border-r transition-all duration-200 ${
            collapsed ? 'w-16' : 'w-64'
          }`}
        >
          <div className="flex items-center justify-between h-16 border-b px-4">
            <h1
              className={`text-xl font-bold text-docgen-blue transition-opacity duration-200 ${
                collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              OPSWriter
            </h1>
            <button
              onClick={() => setCollapsed(prev => !prev)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ul className="p-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center rounded-lg transition px-3 py-2 ${
                        isActive
                          ? 'bg-docgen-blue text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      } ${collapsed ? 'justify-center' : 'space-x-3'}`}
                      title={collapsed ? item.name : undefined}
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span className="font-medium">{item.name}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="border-t p-4">
            <button
              onClick={handleLogout}
              className={`flex items-center px-3 py-2 w-full rounded-lg text-gray-700 hover:bg-gray-100 transition ${
                collapsed ? 'justify-center' : 'space-x-3'
              }`}
              title={collapsed ? 'Logout' : undefined}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
        {collapsed && (
          <div className="flex flex-col justify-center border-l px-1">
            <button
              onClick={() => setCollapsed(false)}
              className="m-2 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
              aria-label="Expand navigation"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
