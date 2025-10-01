'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Book,
  Building,
  Calendar,
  Copy,
  FileText,
  Globe,
  Hash,
  Image,
  Save,
  Tag,
  User,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: string
}

interface Chapter {
  id: string
  manual_id: string
  parent_id: string | null
  chapter_number: string
  title: string
  content: string
  page_break_before: boolean
  display_order: number
}

interface Manual {
  id: string
  title: string
  description: string
  organization_name: string
  language: string
  manual_code: string
  reference_number: string | null
  tags: string[] | null
  effective_date: string | null
  cover_logo_url: string | null
}

interface ManualFormProps {
  userProfile: UserProfile | null
  sourceManual?: Manual | null
  sourceChapters?: Chapter[] | null
  cloneTitle?: string
  cloneCode?: string
}

export default function ManualForm({
  userProfile,
  sourceManual,
  sourceChapters,
  cloneTitle,
  cloneCode
}: ManualFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Manual metadata fields - initialize with clone data if provided
  const [title, setTitle] = useState(cloneTitle || sourceManual?.title || '')
  const [description, setDescription] = useState(sourceManual?.description || '')
  const [organizationName, setOrganizationName] = useState(sourceManual?.organization_name || 'Heli Air Sweden')
  const [language, setLanguage] = useState(sourceManual?.language || 'en')
  const [manualCode, setManualCode] = useState(cloneCode || '')
  const [referenceNumber, setReferenceNumber] = useState(sourceManual?.reference_number || '')
  const [tags, setTags] = useState<string[]>(sourceManual?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [coverLogoUrl, setCoverLogoUrl] = useState(sourceManual?.cover_logo_url || '')
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Handle tag addition
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    setError(null)

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file')
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB')
      }

      // Ensure storage buckets are initialized
      const initResponse = await fetch('/api/storage/init', {
        method: 'POST'
      })

      if (!initResponse.ok) {
        const error = await initResponse.json()
        throw new Error(error.error || 'Failed to initialize storage')
      }

      // Upload to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `logos/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(filePath)

      setCoverLogoUrl(publicUrl)
    } catch (error: any) {
      setError(error.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!manualCode.trim()) {
      setError('Manual code is required')
      return
    }

    if (!organizationName.trim()) {
      setError('Organization name is required')
      return
    }

    setLoading(true)

    try {
      // Create the manual
      const { data: manual, error: manualError } = await supabase
        .from('manuals')
        .insert({
          title: title.trim(),
          description: description.trim(),
          organization_name: organizationName.trim(),
          language,
          manual_code: manualCode.trim(),
          reference_number: referenceNumber.trim() || null,
          tags: tags.length > 0 ? tags : null,
          status: 'draft',
          current_revision: '0',
          effective_date: effectiveDate || null,
          cover_logo_url: coverLogoUrl || null,
          created_by: userProfile?.id,
          is_archived: false
        })
        .select()
        .single()

      if (manualError) throw manualError

      // If cloning, copy chapter structure
      if (sourceChapters && sourceChapters.length > 0) {
        // Create a mapping of old IDs to new IDs for maintaining parent relationships
        const idMapping: Record<string, string> = {}

        // Sort chapters by parent_id (null first) and then by display_order
        const sortedChapters = [...sourceChapters].sort((a, b) => {
          if (a.parent_id === null && b.parent_id !== null) return -1
          if (a.parent_id !== null && b.parent_id === null) return 1
          return a.display_order - b.display_order
        })

        // Clone each chapter
        for (const sourceChapter of sortedChapters) {
          const newParentId = sourceChapter.parent_id
            ? idMapping[sourceChapter.parent_id]
            : null

          const { data: newChapter, error: chapterError } = await supabase
            .from('chapters')
            .insert({
              manual_id: manual.id,
              parent_id: newParentId,
              chapter_number: sourceChapter.chapter_number,
              title: sourceChapter.title,
              content: '', // Don't copy content
              page_break_before: sourceChapter.page_break_before,
              display_order: sourceChapter.display_order,
              created_by: userProfile?.id
            })
            .select()
            .single()

          if (chapterError) throw chapterError

          // Store the ID mapping
          idMapping[sourceChapter.id] = newChapter.id
        }
      } else {
        // Create mandatory Chapter 0 for new manuals
        const { error: chapterError } = await supabase
          .from('chapters')
          .insert({
            manual_id: manual.id,
            parent_id: null,
            chapter_number: '0',
            title: 'Introduction',
            content: '',
            page_break_before: false,
            display_order: 0,
            created_by: userProfile?.id
          })

        if (chapterError) throw chapterError
      }

      // Log to audit trail
      await supabase.from('audit_logs').insert({
        entity_type: 'manual',
        entity_id: manual.id,
        action: 'create',
        actor_id: userProfile?.id,
        actor_email: userProfile?.email || '',
        metadata: {
          title: manual.title,
          manual_code: manual.manual_code,
          initial_status: 'draft'
        }
      })

      // Redirect to edit page
      router.push(`/dashboard/manuals/${manual.id}/edit`)
    } catch (error: any) {
      setError(error.message || 'Failed to create manual')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white shadow-sm rounded-lg p-6">
      {/* Clone notice */}
      {sourceManual && (
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Copy className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Cloning from: {sourceManual.title}
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                The chapter structure will be copied, but all content will be empty.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
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

      {/* Basic Information */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Title */}
          <div className="col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Manual Title *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Book className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
                placeholder="e.g., Helicopter Operations Manual"
                required
              />
            </div>
          </div>

          {/* Manual Code */}
          <div>
            <label htmlFor="manual-code" className="block text-sm font-medium text-gray-700">
              Manual Code *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="manual-code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
                placeholder="e.g., HOM-001"
                required
              />
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label htmlFor="reference-number" className="block text-sm font-medium text-gray-700">
              Reference Number
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="reference-number"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
                placeholder="e.g., REF-2024-001"
              />
            </div>
          </div>

          {/* Description */}
          <div className="col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <div className="mt-1">
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
                placeholder="Brief description of the manual's purpose and scope..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Organization Details */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Organization Details</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Organization Name */}
          <div>
            <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
              Organization *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="organization"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
                required
              />
            </div>
          </div>

          {/* Language */}
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700">
              Language *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
              >
                <option value="en">English</option>
                <option value="sv">Swedish</option>
                <option value="no">Norwegian</option>
                <option value="da">Danish</option>
                <option value="fi">Finnish</option>
              </select>
            </div>
          </div>

          {/* Effective Date */}
          <div>
            <label htmlFor="effective-date" className="block text-sm font-medium text-gray-700">
              Effective Date
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                id="effective-date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
              />
            </div>
          </div>

          {/* Owner */}
          <div>
            <label htmlFor="owner" className="block text-sm font-medium text-gray-700">
              Owner
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="owner"
                value={userProfile?.full_name || userProfile?.email || ''}
                disabled
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Tags & Categories</h2>
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
            Tags
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Tag className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
                placeholder="Add a tag and press Enter"
              />
            </div>
            <button
              type="button"
              onClick={addTag}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-docgen-blue"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cover Logo */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Cover Logo</h2>
        <div>
          <label htmlFor="cover-logo" className="block text-sm font-medium text-gray-700">
            Upload Logo
          </label>
          <div className="mt-1 flex items-center space-x-4">
            {coverLogoUrl ? (
              <img
                src={coverLogoUrl}
                alt="Cover logo"
                className="h-20 w-20 object-contain border border-gray-300 rounded"
              />
            ) : (
              <div className="h-20 w-20 border-2 border-gray-300 border-dashed rounded flex items-center justify-center">
                <Image className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div>
              <label
                htmlFor="logo-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-docgen-blue hover:text-blue-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-docgen-blue"
              >
                <span>{coverLogoUrl ? 'Change logo' : 'Upload logo'}</span>
                <input
                  id="logo-upload"
                  name="logo-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
              </label>
              {uploadingLogo && (
                <p className="text-sm text-gray-500 mt-1">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
                  Uploading...
                </p>
              )}
              {coverLogoUrl && (
                <button
                  type="button"
                  onClick={() => setCoverLogoUrl('')}
                  className="ml-3 text-sm text-red-600 hover:text-red-500"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            PNG, JPG, GIF, or SVG up to 5MB
          </p>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-4 pt-4 border-t">
        <button
          type="button"
          onClick={() => router.push('/dashboard/manuals')}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-docgen-blue"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-docgen-blue hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-docgen-blue disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Create Manual
            </>
          )}
        </button>
      </div>
    </form>
  )
}