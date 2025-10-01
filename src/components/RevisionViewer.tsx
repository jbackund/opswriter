'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AlertCircle,
  ArrowLeft,
  GitBranch,
  Calendar,
  User,
  Book,
  Building,
  FileText,
  Lock,
  GitCompare,
} from 'lucide-react'

interface Revision {
  id: string
  manual_id: string
  revision_number: string
  status: string
  snapshot: any
  changes_summary: string | null
  created_at: string
  created_by_user: {
    full_name: string
    email: string
  }
}

interface Chapter {
  id: string
  chapter_number: number
  section_number: number | null
  subsection_number: number | null
  heading: string
  page_break: boolean
  display_order: number
  depth: number
  content_blocks?: any[]
  chapter_remarks?: any[]
}

interface RevisionViewerProps {
  revisionId: string
  manualId: string
  onClose: () => void
  onCompareWithCurrent: () => void
}

export default function RevisionViewer({
  revisionId,
  manualId,
  onClose,
  onCompareWithCurrent,
}: RevisionViewerProps) {
  const [revision, setRevision] = useState<Revision | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)

  useEffect(() => {
    fetchRevision()
  }, [revisionId, manualId])

  const fetchRevision = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/manuals/${manualId}/revisions/${revisionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch revision')
      }

      const data = await response.json()
      setRevision(data.revision)

      // Auto-select first chapter
      if (data.revision?.snapshot?.manual?.chapters?.length > 0) {
        setSelectedChapter(data.revision.snapshot.manual.chapters[0])
      }
    } catch (err) {
      console.error('Error fetching revision:', err)
      setError('Failed to load revision')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getChapterNumber = (chapter: Chapter) => {
    let num = `${chapter.chapter_number}`
    if (chapter.section_number !== null) num += `.${chapter.section_number}`
    if (chapter.subsection_number !== null) num += `.${chapter.subsection_number}`
    return num
  }

  const buildChapterTree = (chapters: Chapter[], parentId: string | null = null, level: number = 0): any[] => {
    return chapters
      .filter((ch: any) => ch.parent_id === parentId)
      .sort((a, b) => a.display_order - b.display_order)
      .map((chapter) => ({
        chapter,
        children: buildChapterTree(chapters, chapter.id, level + 1),
        level,
      }))
  }

  const renderChapterTree = (tree: any[]) => {
    return tree.map(({ chapter, children, level }) => (
      <div key={chapter.id}>
        <button
          onClick={() => setSelectedChapter(chapter)}
          className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
            selectedChapter?.id === chapter.id
              ? 'bg-blue-100 text-blue-900 font-medium'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        >
          <span className="text-sm">
            {getChapterNumber(chapter)} {chapter.heading}
          </span>
          {chapter.page_break && (
            <span className="ml-2 text-xs text-gray-500">(Page Break)</span>
          )}
        </button>
        {children.length > 0 && renderChapterTree(children)}
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !revision) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <p>{error || 'Revision not found'}</p>
        </div>
        <button
          onClick={onClose}
          className="mt-4 text-sm text-red-600 hover:text-red-800 underline"
        >
          Go back
        </button>
      </div>
    )
  }

  const manual = revision.snapshot?.manual
  const chapters = manual?.chapters || []
  const chapterTree = buildChapterTree(chapters)

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Warning Header */}
      <div className="bg-yellow-50 border-b-2 border-yellow-400 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-6 w-6 text-yellow-600" />
            <div>
              <h2 className="text-lg font-semibold text-yellow-900">
                Viewing Historical Revision {revision.revision_number}
              </h2>
              <p className="text-sm text-yellow-800">
                This is a read-only snapshot. Changes are not allowed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCompareWithCurrent}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium"
            >
              <GitCompare className="h-4 w-4" />
              Compare with Current
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Current
            </button>
          </div>
        </div>
      </div>

      {/* Revision Metadata */}
      <div className="bg-white border-b px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500">Revision:</span>
              <span className="ml-1 font-semibold">{revision.revision_number}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500">Created:</span>
              <span className="ml-1 font-semibold">{formatDate(revision.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500">By:</span>
              <span className="ml-1 font-semibold">{revision.created_by_user?.full_name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500">Status:</span>
              <span className={`ml-1 font-semibold capitalize ${
                revision.status === 'approved' ? 'text-green-600' :
                revision.status === 'rejected' ? 'text-red-600' :
                revision.status === 'in_review' ? 'text-yellow-600' :
                'text-orange-600'
              }`}>
                {revision.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        {revision.changes_summary && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-gray-700">
              <strong>Changes:</strong> {revision.changes_summary}
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Chapter Navigation */}
        <div className="w-80 bg-white border-r overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Book className="h-4 w-4" />
              Manual Structure
            </h3>
            <div className="space-y-1">
              {chapterTree.length > 0 ? (
                renderChapterTree(chapterTree)
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No chapters</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-4xl mx-auto p-8">
            {/* Manual Metadata */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{manual?.title}</h1>
              {manual?.description && (
                <p className="text-gray-600 mb-4">{manual.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  <span>{manual?.organization_name}</span>
                </div>
                <div>
                  <strong>Code:</strong> {manual?.manual_code}
                </div>
                {manual?.effective_date && (
                  <div>
                    <strong>Effective:</strong> {new Date(manual.effective_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Chapter Content */}
            {selectedChapter ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    {getChapterNumber(selectedChapter)} {selectedChapter.heading}
                  </h2>
                  {selectedChapter.page_break && (
                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      Page Break Before
                    </span>
                  )}
                </div>

                {/* Content Blocks */}
                {selectedChapter.content_blocks && selectedChapter.content_blocks.length > 0 ? (
                  <div className="space-y-4">
                    {selectedChapter.content_blocks
                      .sort((a: any, b: any) => a.display_order - b.display_order)
                      .map((block: any) => (
                        <div
                          key={block.id}
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: block.content?.html || '<p class="text-gray-500 italic">No content</p>',
                          }}
                        />
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No content in this chapter</p>
                )}

                {/* Chapter Remarks */}
                {selectedChapter.chapter_remarks && selectedChapter.chapter_remarks.length > 0 && (
                  <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-yellow-900 mb-2">Remarks:</h3>
                    {selectedChapter.chapter_remarks
                      .sort((a: any, b: any) => a.display_order - b.display_order)
                      .map((remark: any) => (
                        <p key={remark.id} className="text-sm text-yellow-800">
                          {remark.remark_text}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a chapter to view its content</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
