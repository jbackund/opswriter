'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Settings, Building2, Palette, FileText, Hash, Shield, Save } from 'lucide-react'
import OrganizationSettings from '@/components/settings/OrganizationSettings'
import ReferenceCategoriesSettings from '@/components/settings/ReferenceCategoriesSettings'
import SecuritySettings from '@/components/settings/SecuritySettings'

interface SettingsTab {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  requiresSysAdmin?: boolean
}

const tabs: SettingsTab[] = [
  {
    id: 'organization',
    label: 'Organization',
    icon: Building2,
    description: 'Configure organization name, branding, and defaults',
    requiresSysAdmin: true,
  },
  {
    id: 'categories',
    label: 'Reference Categories',
    icon: Hash,
    description: 'Manage categories for definitions and abbreviations',
    requiresSysAdmin: true,
  },
  {
    id: 'security',
    label: 'Security & Privacy',
    icon: Shield,
    description: 'View security settings and audit logs',
    requiresSysAdmin: false,
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [activeTab, setActiveTab] = useState('organization')
  const [userRole, setUserRole] = useState<'manager' | 'sysadmin'>('manager')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUserRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserRole(profile.role as 'manager' | 'sysadmin')
      }
      setLoading(false)
    }

    checkUserRole()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    )
  }

  const availableTabs = tabs.filter(
    tab => !tab.requiresSysAdmin || userRole === 'sysadmin'
  )

  const activeTabData = availableTabs.find(tab => tab.id === activeTab)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-gray-600">
          Manage your organization settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {availableTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {activeTabData && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {activeTabData.label}
                </h2>
                <p className="text-gray-600">{activeTabData.description}</p>
              </div>
            )}

            {activeTab === 'organization' && userRole === 'sysadmin' && (
              <OrganizationSettings />
            )}

            {activeTab === 'categories' && userRole === 'sysadmin' && (
              <ReferenceCategoriesSettings />
            )}

            {activeTab === 'security' && (
              <SecuritySettings userRole={userRole} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}