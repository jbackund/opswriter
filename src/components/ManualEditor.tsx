'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Save,
  Plus,
  ChevronRight,
  ChevronDown,
  Edit3,
  Trash2,
  Copy,
  FileText,
  Settings,
  Book,
  Loader2,
  AlertCircle,
  Check,
  Send,
  ArrowLeft,
  Hash,
  Building,
  X
} from 'lucide-react'

interface Chapter {
  id: string
  manual_id: string
  parent_id: string | null
  chapter_number: number
  section_number: number | null
  subsection_number: number | null
  heading: string
  content?: string
  page_break: boolean
  display_order: number
  depth: number
  is_mandatory: boolean
  created_at: string
  updated_at: string
}

interface Manual {
  id: string
  title: string
  description: string
  organization_name: string
  manual_code: string
  reference_number: string | null
  status: string
  current_revision: string
  effective_date: string | null
  tags: string[] | null
  created_by: string
  created_by_user: {
    full_name: string
    email: string
  }
  chapters: Chapter[]
}

interface ManualEditorProps {
  manual: Manual
  userId: string
}

export default function ManualEditor({ manual: initialManual, userId }: ManualEditorProps) {
  const router = useRouter()
  const supabase = createClient()

  // State
  const [manual, setManual] = useState(initialManual)
  const [chapters, setChapters] = useState<Chapter[]>(initialManual.chapters || [])
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [chapterTitle, setChapterTitle] = useState('')
  const [chapterContent, setChapterContent] = useState('')
  const [pageBreakBefore, setPageBreakBefore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showMetadataModal, setShowMetadataModal] = useState(false)

  // Load chapter 0 by default
  useEffect(() => {
    const chapter0 = chapters.find(ch => ch.chapter_number === 0)
    if (chapter0 && !selectedChapter) {
      setSelectedChapter(chapter0)
      setChapterTitle(chapter0.heading)
      setChapterContent(chapter0.content || '')
      setPageBreakBefore(chapter0.page_break)
    }
  }, [chapters])

  // Build chapter tree
  const buildChapterTree = (parentId: string | null = null, level: number = 0): any[] => {
    return chapters
      .filter(ch => ch.parent_id === parentId)
      .sort((a, b) => a.display_order - b.display_order)
      .map(chapter => ({
        ...chapter,
        level,
        children: buildChapterTree(chapter.id, level + 1)
      }))
  }

  const chapterTree = buildChapterTree()

  // Toggle chapter expansion
  const toggleChapterExpansion = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters)
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId)
    } else {
      newExpanded.add(chapterId)
    }
    setExpandedChapters(newExpanded)
  }

  // Select chapter for editing
  const selectChapter = (chapter: Chapter) => {
    // Save current chapter if changed
    if (selectedChapter && (
      chapterTitle !== selectedChapter.heading ||
      chapterContent !== selectedChapter.content ||
      pageBreakBefore !== selectedChapter.page_break
    )) {
      saveChapter()
    }

    setSelectedChapter(chapter)
    setChapterTitle(chapter.heading)
    setChapterContent(chapter.content || '')
    setPageBreakBefore(chapter.page_break)
    setEditingChapter(null)
  }

  // Add new chapter
  const addChapter = async (parentId: string | null = null) => {
    try {
      // Calculate chapter number and depth
      const siblings = chapters.filter(ch => ch.parent_id === parentId)
      const nextNumber = siblings.length + 1
      const parentChapter = parentId ? chapters.find(ch => ch.id === parentId) : null

      // Determine the numbering based on depth
      let chapterNum = nextNumber
      let sectionNum = null
      let subsectionNum = null
      let depth = 0

      if (parentChapter) {
        depth = parentChapter.depth + 1
        if (depth === 1) {
          chapterNum = parentChapter.chapter_number
          sectionNum = nextNumber
        } else if (depth === 2) {
          chapterNum = parentChapter.chapter_number
          sectionNum = parentChapter.section_number
          subsectionNum = nextNumber
        }
      }

      // Create new chapter
      const { data, error: chapterError } = await supabase
        .from('chapters')
        .insert({
          manual_id: manual.id,
          parent_id: parentId,
          chapter_number: chapterNum,
          section_number: sectionNum,
          subsection_number: subsectionNum,
          heading: 'New Chapter',
          content: '',
          page_break: false,
          display_order: siblings.length,
          depth: depth,
          is_mandatory: false,
          created_by: userId
        })
        .select()
        .single()

      if (chapterError) throw chapterError

      // Update local state
      setChapters([...chapters, data])
      setSelectedChapter(data)
      setChapterTitle(data.title)
      setChapterContent(data.content)
      setPageBreakBefore(data.page_break)
      setEditingChapter(data.id)

      // Expand parent if adding subchapter
      if (parentId) {
        const newExpanded = new Set(expandedChapters)
        newExpanded.add(parentId)
        setExpandedChapters(newExpanded)
      }

      setSuccess('Chapter added successfully')
    } catch (error: any) {
      setError(error.message || 'Failed to add chapter')
    }
  }

  // Save chapter
  const saveChapter = async () => {
    if (!selectedChapter) return

    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('chapters')
        .update({
          heading: chapterTitle,
          content: chapterContent,
          page_break: pageBreakBefore,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedChapter.id)

      if (updateError) throw updateError

      // Update local state
      setChapters(chapters.map(ch =>
        ch.id === selectedChapter.id
          ? { ...ch, heading: chapterTitle, content: chapterContent, page_break: pageBreakBefore }
          : ch
      ))
      setSelectedChapter({ ...selectedChapter, heading: chapterTitle, content: chapterContent, page_break: pageBreakBefore })
      setSuccess('Chapter saved successfully')
    } catch (error: any) {
      setError(error.message || 'Failed to save chapter')
    } finally {
      setSaving(false)
    }
  }

  // Delete chapter
  const deleteChapter = async (chapterId: string) => {
    const chapterToDelete = chapters.find(ch => ch.id === chapterId)
    if (!chapterToDelete) return

    // Don't allow deleting Chapter 0
    if (chapterToDelete.chapter_number === 0) {
      setError('Chapter 0 cannot be deleted')
      return
    }

    // Check if chapter has children
    const hasChildren = chapters.some(ch => ch.parent_id === chapterId)
    if (hasChildren) {
      setError('Cannot delete chapter with subchapters. Delete subchapters first.')
      return
    }

    if (!confirm(`Are you sure you want to delete "${chapterToDelete.heading}"?`)) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId)

      if (deleteError) throw deleteError

      // Update local state
      setChapters(chapters.filter(ch => ch.id !== chapterId))

      // If deleted chapter was selected, select Chapter 0
      if (selectedChapter?.id === chapterId) {
        const chapter0 = chapters.find(ch => ch.chapter_number === '0')
        if (chapter0) {
          selectChapter(chapter0)
        }
      }

      setSuccess('Chapter deleted successfully')
    } catch (error: any) {
      setError(error.message || 'Failed to delete chapter')
    }
  }

  // Send manual for review
  const sendForReview = async () => {
    if (!confirm('Are you sure you want to send this manual for review? You will not be able to edit it while it\'s under review.')) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('manuals')
        .update({
          status: 'in_review',
          updated_at: new Date().toISOString()
        })
        .eq('id', manual.id)

      if (updateError) throw updateError

      // Log to audit trail
      await supabase.from('audit_logs').insert({
        entity_type: 'manual',
        entity_id: manual.id,
        action: 'status_change',
        actor_id: userId,
        metadata: {
          from_status: 'draft',
          to_status: 'in_review',
          manual_title: manual.title
        }
      })

      router.push('/dashboard/manuals')
    } catch (error: any) {
      setError(error.message || 'Failed to send for review')
      setSaving(false)
    }
  }

  // Render chapter tree item
  const renderChapterItem = (chapter: any) => {
    const hasChildren = chapter.children && chapter.children.length > 0
    const isExpanded = expandedChapters.has(chapter.id)
    const isSelected = selectedChapter?.id === chapter.id
    const isEditing = editingChapter === chapter.id

    return (
      <div key={chapter.id}>
        <div
          className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded ${
            isSelected ? 'bg-docgen-blue bg-opacity-10' : ''
          }`}
          style={{ paddingLeft: `${chapter.level * 20 + 8}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleChapterExpansion(chapter.id)}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <div
            className="flex-1 flex items-center ml-1"
            onClick={() => selectChapter(chapter)}
          >
            <span className="text-sm font-medium text-gray-500 mr-2">
              {chapter.chapter_number}
            </span>
            {isEditing ? (
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                onBlur={() => {
                  saveChapter()
                  setEditingChapter(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveChapter()
                    setEditingChapter(null)
                  }
                }}
                className="flex-1 text-sm border-b border-gray-300 focus:border-docgen-blue focus:outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 text-sm">{chapter.heading}</span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingChapter(chapter.id)
                setChapterTitle(chapter.heading)
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="Rename"
            >
              <Edit3 className="h-3 w-3 text-gray-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                addChapter(chapter.id)
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="Add subchapter"
            >
              <Plus className="h-3 w-3 text-gray-500" />
            </button>
            {chapter.chapter_number !== 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteChapter(chapter.id)
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Delete"
              >
                <Trash2 className="h-3 w-3 text-gray-500" />
              </button>
            )}
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {chapter.children.map((child: any) => renderChapterItem(child))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard/manuals')}
              className="p-2 hover:bg-gray-100 rounded"
              title="Back to manuals"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900">{manual.title}</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  <Hash className="h-3 w-3 mr-1" />
                  {manual.manual_code}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Rev {manual.current_revision}
                </span>
              </div>
              <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                <span className="flex items-center">
                  <Building className="h-4 w-4 mr-1" />
                  {manual.organization_name}
                </span>
                <span>•</span>
                <span>Owner: {manual.created_by_user?.full_name || manual.created_by_user?.email}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMetadataModal(true)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Settings className="h-4 w-4 mr-1" />
              Metadata
            </button>
            <button
              onClick={sendForReview}
              disabled={saving}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-status-green hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Send for Review
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="px-6 py-2 bg-red-50 border-b border-red-200">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
            <span className="text-sm text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="px-6 py-2 bg-green-50 border-b border-green-200">
          <div className="flex items-center">
            <Check className="h-4 w-4 text-green-400 mr-2" />
            <span className="text-sm text-green-800">{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chapter navigation sidebar */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Chapters</h2>
              <button
                onClick={() => addChapter(null)}
                className="p-1.5 hover:bg-gray-100 rounded"
                title="Add chapter"
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {chapterTree.map(chapter => renderChapterItem(chapter))}
          </div>
        </div>

        {/* Chapter editor */}
        <div className="flex-1 bg-gray-50 flex flex-col">
          {selectedChapter ? (
            <>
              <div className="bg-white border-b px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Chapter {selectedChapter.chapter_number}: {selectedChapter.heading}
                    </h2>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={pageBreakBefore}
                        onChange={(e) => setPageBreakBefore(e.target.checked)}
                        className="rounded border-gray-300 text-docgen-blue focus:ring-docgen-blue"
                      />
                      <span className="ml-2 text-sm text-gray-600">Page break before</span>
                    </label>
                    <button
                      onClick={saveChapter}
                      disabled={saving}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-docgen-blue hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Save Chapter
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chapter Content
                  </label>
                  <textarea
                    value={chapterContent}
                    onChange={(e) => setChapterContent(e.target.value)}
                    className="w-full h-96 p-4 border border-gray-300 rounded-md focus:ring-docgen-blue focus:border-docgen-blue"
                    placeholder="Enter chapter content..."
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Rich text editor coming soon. For now, use plain text or markdown formatting.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Select a chapter to start editing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}