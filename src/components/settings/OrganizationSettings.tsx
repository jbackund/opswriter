'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Save, Upload, AlertCircle, Check } from 'lucide-react'

interface OrganizationSettingsData {
  id?: string
  organization_name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  footer_text: string | null
  default_review_days: number
  auto_increment_revision: boolean
}

export default function OrganizationSettings() {
  const supabase = createClientComponentClient()
  const [settings, setSettings] = useState<OrganizationSettingsData>({
    organization_name: '',
    logo_url: null,
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    footer_text: '',
    default_review_days: 7,
    auto_increment_revision: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found
        throw error
      }

      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({
        type: 'error',
        text: 'Failed to load organization settings',
      })
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    setMessage(null)

    try {
      let result
      if (settings.id) {
        // Update existing settings
        result = await supabase
          .from('organization_settings')
          .update({
            organization_name: settings.organization_name,
            logo_url: settings.logo_url,
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
            footer_text: settings.footer_text,
            default_review_days: settings.default_review_days,
            auto_increment_revision: settings.auto_increment_revision,
          })
          .eq('id', settings.id)
          .select()
          .single()
      } else {
        // Insert new settings
        result = await supabase
          .from('organization_settings')
          .insert({
            organization_name: settings.organization_name,
            logo_url: settings.logo_url,
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
            footer_text: settings.footer_text,
            default_review_days: settings.default_review_days,
            auto_increment_revision: settings.auto_increment_revision,
          })
          .select()
          .single()
      }

      if (result.error) throw result.error

      setSettings(result.data)
      setMessage({
        type: 'success',
        text: 'Organization settings saved successfully',
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({
        type: 'error',
        text: 'Failed to save organization settings',
      })
    } finally {
      setSaving(false)
    }
  }

  async function uploadLogo(file: File) {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `org-logo-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      setSettings({ ...settings, logo_url: publicUrl })
      setMessage({
        type: 'success',
        text: 'Logo uploaded successfully',
      })
    } catch (error) {
      console.error('Error uploading logo:', error)
      setMessage({
        type: 'error',
        text: 'Failed to upload logo',
      })
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading organization settings...</div>
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Organization Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Organization Name
        </label>
        <input
          type="text"
          value={settings.organization_name}
          onChange={(e) => setSettings({ ...settings, organization_name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter organization name"
        />
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Organization Logo
        </label>
        <div className="flex items-center gap-4">
          {settings.logo_url && (
            <img
              src={settings.logo_url}
              alt="Organization logo"
              className="h-16 w-auto object-contain"
            />
          )}
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <Upload className="h-5 w-5" />
            <span>Upload Logo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadLogo(file)
              }}
            />
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Recommended: PNG or SVG, max 2MB
        </p>
      </div>

      {/* Brand Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.primary_color}
              onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
              className="h-10 w-20"
            />
            <input
              type="text"
              value={settings.primary_color}
              onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#3B82F6"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Secondary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.secondary_color}
              onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
              className="h-10 w-20"
            />
            <input
              type="text"
              value={settings.secondary_color}
              onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#10B981"
            />
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Default PDF Footer Text
        </label>
        <textarea
          value={settings.footer_text || ''}
          onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="This is a controlled document. Unauthorized distribution is prohibited."
        />
      </div>

      {/* Review Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Review Period (days)
          </label>
          <input
            type="number"
            min="1"
            max="90"
            value={settings.default_review_days}
            onChange={(e) => setSettings({
              ...settings,
              default_review_days: parseInt(e.target.value) || 7
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Auto-increment Revision
          </label>
          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={settings.auto_increment_revision}
                onChange={() => setSettings({ ...settings, auto_increment_revision: true })}
                className="text-blue-600"
              />
              <span>Enabled</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!settings.auto_increment_revision}
                onChange={() => setSettings({ ...settings, auto_increment_revision: false })}
                className="text-blue-600"
              />
              <span>Disabled</span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-5 w-5" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  )
}