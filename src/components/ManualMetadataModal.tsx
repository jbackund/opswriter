'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'
import {
  AlertCircle,
  Book,
  Building,
  Calendar,
  CheckCircle2,
  Globe,
  Hash,
  Loader2,
  Tag,
  User,
  X,
} from 'lucide-react'

type ManualRow = Database['public']['Tables']['manuals']['Row']

interface ManualMetadataModalProps {
  manual: ManualRow & {
    created_by_user?: {
      full_name: string
      email: string
    } | null
  }
  isOpen: boolean
  userId: string
  onClose: () => void
  onUpdated: (manual: ManualRow) => void
}

const AVAILABLE_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'sv', label: 'Swedish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'da', label: 'Danish' },
  { value: 'fi', label: 'Finnish' },
]

export default function ManualMetadataModal({
  manual,
  isOpen,
  userId,
  onClose,
  onUpdated,
}: ManualMetadataModalProps) {
  const supabase = useMemo(() => createClient(), [])

  const [title, setTitle] = useState(manual.title)
  const [description, setDescription] = useState(manual.description || '')
  const [organizationName, setOrganizationName] = useState(manual.organization_name)
  const [manualCode, setManualCode] = useState(manual.manual_code)
  const [referenceNumber, setReferenceNumber] = useState(manual.reference_number || '')
  const [language, setLanguage] = useState(manual.language || 'en')
  const [effectiveDate, setEffectiveDate] = useState(
    manual.effective_date ? manual.effective_date.split('T')[0] : ''
  )
  const [tags, setTags] = useState<string[]>(manual.tags || [])
  const [tagInput, setTagInput] = useState('')

  const [checkingCode, setCheckingCode] = useState(false)
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens or manual changes
  useEffect(() => {
    if (!isOpen) return

    setTitle(manual.title)
    setDescription(manual.description || '')
    setOrganizationName(manual.organization_name)
    setManualCode(manual.manual_code)
    setReferenceNumber(manual.reference_number || '')
    setLanguage(manual.language || 'en')
    setEffectiveDate(manual.effective_date ? manual.effective_date.split('T')[0] : '')
    setTags(manual.tags || [])
    setTagInput('')
    setCodeAvailable(true)
    setError(null)
  }, [manual, isOpen])

  // Check manual code availability when it changes
  useEffect(() => {
    if (!isOpen) return
    const trimmedCode = manualCode.trim().toUpperCase()

    if (!trimmedCode) {
      setCodeAvailable(null)
      return
    }

    if (trimmedCode === manual.manual_code.toUpperCase()) {
      setCodeAvailable(true)
      return
    }

    setCheckingCode(true)
    const timeoutId = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('manuals')
          .select('id')
          .eq('manual_code', trimmedCode)
          .neq('id', manual.id)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        setCodeAvailable(!data)
      } catch (checkError) {
        console.error('Error checking manual code availability', checkError)
        setCodeAvailable(null)
      } finally {
        setCheckingCode(false)
      }
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [manualCode, manual.id, manual.manual_code, supabase, isOpen])

  const addTag = () => {
    const value = tagInput.trim()
    if (!value) return
    if (tags.includes(value)) {
      setTagInput('')
      return
    }
    setTags(prev => [...prev, value])
    setTagInput('')
  }

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const trimmedTitle = title.trim()
    const trimmedManualCode = manualCode.trim().toUpperCase()
    const trimmedOrg = organizationName.trim()

    if (!trimmedTitle) {
      setError('Manual title is required.')
      return
    }

    if (!trimmedManualCode) {
      setError('Manual code is required.')
      return
    }

    if (codeAvailable === false) {
      setError('This manual code is already in use. Please choose a different code.')
      return
    }

    if (!trimmedOrg) {
      setError('Organization name is required.')
      return
    }

    setSaving(true)

    try {
      const updates: Partial<ManualRow> = {
        title: trimmedTitle,
        description: description.trim() || null,
        organization_name: trimmedOrg,
        manual_code: trimmedManualCode,
        reference_number: referenceNumber.trim() || null,
        language,
        effective_date: effectiveDate || null,
        tags: tags.length > 0 ? tags : null,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }

      const { data, error: updateError } = await supabase
        .from('manuals')
        .update(updates)
        .eq('id', manual.id)
        .select()
        .single()

      if (updateError) throw updateError
      if (!data) {
        throw new Error('Failed to update manual metadata')
      }

      onUpdated(data)
      onClose()
    } catch (submitError: any) {
      if (
        typeof submitError.message === 'string' &&
        (submitError.message.includes('duplicate key') ||
          submitError.message.includes('manuals_manual_code_key'))
      ) {
        setError(`The manual code "${manualCode}" is already in use. Please choose a different code.`)
        setCodeAvailable(false)
      } else {
        setError(submitError.message || 'Failed to update manual metadata.')
      }
      setSaving(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-12 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-docgen-blue"
          aria-label="Close metadata editor"
        >
          <X className="h-5 w-5" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Manual Metadata</h2>
            <p className="mt-1 text-sm text-gray-500">
              Update the core properties of this manual. Changes are saved immediately for all editors.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="metadata-title" className="block text-sm font-medium text-gray-700">
                Manual Title *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Book className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="metadata-title"
                  type="text"
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-docgen-blue focus:ring-docgen-blue"
                  placeholder="Helicopter Operations Manual"
                />
              </div>
            </div>

            <div>
              <label htmlFor="metadata-code" className="block text-sm font-medium text-gray-700">
                Manual Code *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Hash className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="metadata-code"
                  type="text"
                  value={manualCode}
                  onChange={event => setManualCode(event.target.value.toUpperCase())}
                  className={`block w-full rounded-md border py-2 pl-10 pr-10 text-sm focus:ring-docgen-blue ${
                    codeAvailable === false
                      ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
                      : codeAvailable === true
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                      : 'border-gray-300 focus:border-docgen-blue'
                  }`}
                  placeholder="HOM-001"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  {checkingCode ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  ) : codeAvailable === true ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : codeAvailable === false ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="metadata-organization" className="block text-sm font-medium text-gray-700">
                Organization *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="metadata-organization"
                  type="text"
                  value={organizationName}
                  onChange={event => setOrganizationName(event.target.value)}
                  className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-docgen-blue focus:ring-docgen-blue"
                  placeholder="Heli Air Sweden"
                />
              </div>
            </div>

            <div>
              <label htmlFor="metadata-language" className="block text-sm font-medium text-gray-700">
                Language
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Globe className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="metadata-language"
                  value={language}
                  onChange={event => setLanguage(event.target.value)}
                  className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-docgen-blue focus:ring-docgen-blue"
                >
                  {AVAILABLE_LANGUAGES.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="metadata-effective-date" className="block text-sm font-medium text-gray-700">
                Effective Date
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="metadata-effective-date"
                  type="date"
                  value={effectiveDate}
                  onChange={event => setEffectiveDate(event.target.value)}
                  className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-docgen-blue focus:ring-docgen-blue"
                />
              </div>
            </div>

            <div>
              <label htmlFor="metadata-reference-number" className="block text-sm font-medium text-gray-700">
                Reference Number
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Tag className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="metadata-reference-number"
                  type="text"
                  value={referenceNumber}
                  onChange={event => setReferenceNumber(event.target.value)}
                  className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-docgen-blue focus:ring-docgen-blue"
                  placeholder="e.g., REV-2024-01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Owner</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={manual.created_by_user?.full_name || manual.created_by_user?.email || 'Unknown owner'}
                  disabled
                  className="block w-full rounded-md border border-gray-300 bg-gray-50 py-2 pl-10 pr-3 text-sm text-gray-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="metadata-description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="metadata-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-docgen-blue focus:ring-docgen-blue"
              placeholder="Short summary of this manual..."
            />
          </div>

          <div>
            <label htmlFor="metadata-tags" className="block text-sm font-medium text-gray-700">
              Tags
            </label>
            <div className="mt-1 flex items-center space-x-2">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Tag className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="metadata-tags"
                  type="text"
                  value={tagInput}
                  onChange={event => setTagInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addTag()
                    }
                  }}
                  className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-docgen-blue focus:ring-docgen-blue"
                  placeholder="Add tag and press Enter"
                />
              </div>
              <button
                type="button"
                onClick={addTag}
                className="inline-flex items-center rounded-md border border-transparent bg-docgen-blue px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 rounded-full p-0.5 text-blue-600 hover:bg-blue-200"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || checkingCode}
              className="inline-flex items-center rounded-md border border-transparent bg-docgen-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
