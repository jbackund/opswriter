'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import RichTextEditor from './RichTextEditor'
import RevisionHistory from './RevisionHistory'
import RevisionViewer from './RevisionViewer'
import DiffViewer from './DiffViewer'
import RestoreModal from './RestoreModal'
import AuditTrail from './AuditTrail'
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
  X,
  MoveUp,
  MoveDown,
  Undo2,
  Redo2,
  History,
  Shield,
  GitBranch
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
  readOnly?: boolean
}

export default function ManualEditor({ manual: initialManual, userId, readOnly = false }: ManualEditorProps) {
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

  // Undo/Redo state
  const [chaptersHistory, setChaptersHistory] = useState<Chapter[][]>([initialManual.chapters || []])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [reorderMode, setReorderMode] = useState(false)

  // Autosave state
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'audit'>('editor')

  // Revision viewing state
  const [viewingRevision, setViewingRevision] = useState<any>(null)
  const [comparingRevisions, setComparingRevisions] = useState<{ revA: any; revB: any } | null>(null)
  const [restoringRevision, setRestoringRevision] = useState<any>(null)

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

  // Autosave effect
  useEffect(() => {
    if (!selectedChapter) return

    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }

    // Check if there are changes to save
    const hasChanges = (
      chapterTitle !== selectedChapter.heading ||
      chapterContent !== selectedChapter.content ||
      pageBreakBefore !== selectedChapter.page_break
    )

    if (hasChanges) {
      setHasUnsavedChanges(true)

      // Set new timer for autosave (30 seconds)
      const timer = setTimeout(() => {
        saveChapter(true) // Pass true to indicate autosave
      }, 30000)

      setAutoSaveTimer(timer)
    }

    // Cleanup
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [chapterTitle, chapterContent, pageBreakBefore])

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

  const getNextSequenceValue = (
    values: Array<number | null | undefined>,
    initialValue: number
  ) => {
    const numbers = values.filter(
      (value): value is number => typeof value === 'number'
    )

    if (numbers.length === 0) {
      return initialValue
    }

    return Math.max(...numbers) + 1
  }

  const normalizeChapterOrdering = async (currentChapters: Chapter[]) => {
    const rootKey = 'root'
    const childrenMap = new Map<string, Chapter[]>()

    currentChapters.forEach(chapterItem => {
      const key = chapterItem.parent_id ?? rootKey
      if (!childrenMap.has(key)) {
        childrenMap.set(key, [])
      }
      childrenMap.get(key)!.push(chapterItem)
    })

    for (const [, childList] of childrenMap) {
      childList.sort((a, b) => a.display_order - b.display_order)
    }

    const chaptersById = new Map<string, Chapter>(
      currentChapters.map(chapterItem => [chapterItem.id, { ...chapterItem }])
    )

    const updatesMap = new Map<string, Partial<Chapter>>()

    const applyUpdate = (id: string, changes: Partial<Chapter>) => {
      const chapterItem = chaptersById.get(id)
      if (!chapterItem) return

      const filteredChanges: Partial<Chapter> = {}
      Object.entries(changes).forEach(([key, value]) => {
        if ((chapterItem as any)[key] !== value) {
          ;(filteredChanges as any)[key] = value
        }
      })

      if (Object.keys(filteredChanges).length === 0) {
        return
      }

      chaptersById.set(id, { ...chapterItem, ...filteredChanges })

      const existing = updatesMap.get(id) ?? {}
      updatesMap.set(id, { ...existing, ...filteredChanges })
    }

    const topLevelChapters = [...(childrenMap.get(rootKey) ?? [])]
    const hasChapterZero = topLevelChapters.some(
      chapterItem => chapterItem.chapter_number === 0
    )

    if (hasChapterZero) {
      const zeroIndex = topLevelChapters.findIndex(
        chapterItem => chapterItem.chapter_number === 0
      )
      if (zeroIndex > 0) {
        const [chapterZero] = topLevelChapters.splice(zeroIndex, 1)
        topLevelChapters.unshift(chapterZero)
      }
    }

    let nextChapterNumber = hasChapterZero ? 1 : 0

    topLevelChapters.forEach((chapterItem, chapterIndex) => {
      const isChapterZero = hasChapterZero && chapterItem.chapter_number === 0
      const assignedChapterNumber = isChapterZero
        ? 0
        : nextChapterNumber++

      applyUpdate(chapterItem.id, {
        chapter_number: assignedChapterNumber,
        section_number: null,
        subsection_number: null,
        display_order: chapterIndex,
      })

      const sections = childrenMap.get(chapterItem.id) ?? []
      sections.forEach((section, sectionIndex) => {
        const sectionNumber = sectionIndex + 1

        applyUpdate(section.id, {
          chapter_number: assignedChapterNumber,
          section_number: sectionNumber,
          subsection_number: null,
          display_order: sectionIndex,
        })

        const subsections = childrenMap.get(section.id) ?? []
        subsections.forEach((subsection, subsectionIndex) => {
          applyUpdate(subsection.id, {
            chapter_number: assignedChapterNumber,
            section_number: sectionNumber,
            subsection_number: subsectionIndex + 1,
            display_order: subsectionIndex,
          })
        })
      })
    })

    const updatesArray = Array.from(updatesMap.entries()).map(
      ([id, values]) => ({
        id,
        ...values,
        updated_at: new Date().toISOString(),
      })
    )

    for (const update of updatesArray) {
      const { id, updated_at, ...fields } = update
      const { error: updateError } = await supabase
        .from('chapters')
        .update({ ...fields, updated_at })
        .eq('id', id)

      if (updateError) {
        throw updateError
      }
    }

    return currentChapters.map(chapterItem => chaptersById.get(chapterItem.id)!)
  }

  // Select chapter for editing
  const selectChapter = (chapter: Chapter) => {
    // Save current chapter if changed
    if (selectedChapter && (
      chapterTitle !== selectedChapter.heading ||
      chapterContent !== selectedChapter.content ||
      pageBreakBefore !== selectedChapter.page_break
    )) {
      saveChapter(false) // Not an autosave
    }

    setSelectedChapter(chapter)
    setChapterTitle(chapter.heading)
    setChapterContent(chapter.content || '')
    setPageBreakBefore(chapter.page_break)
    setEditingChapter(null)
    setHasUnsavedChanges(false)
  }

  // Add new chapter
  const addChapter = async (parentId: string | null = null) => {
    try {
      // Calculate chapter number and depth
      const siblings = chapters.filter(ch => ch.parent_id === parentId)
      const parentChapter = parentId ? chapters.find(ch => ch.id === parentId) : null

      // Determine the numbering based on depth
      let depth = 0
      let chapterNum: number
      let sectionNum: number | null = null
      let subsectionNum: number | null = null

      if (parentChapter) {
        depth = parentChapter.depth + 1

        if (depth === 1) {
          chapterNum = parentChapter.chapter_number
          sectionNum = getNextSequenceValue(
            siblings.map(ch => ch.section_number),
            1
          )
        } else {
          chapterNum = parentChapter.chapter_number
          sectionNum = parentChapter.section_number
          subsectionNum = getNextSequenceValue(
            siblings.map(ch => ch.subsection_number),
            1
          )
        }
      } else {
        const fallbackStart = siblings.some(ch => ch.chapter_number === 0) ? 1 : 0
        chapterNum = getNextSequenceValue(
          siblings.map(ch => ch.chapter_number),
          fallbackStart
        )
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
      const newChapters = [...chapters, data]
      setChapters(newChapters)
      addToHistory(newChapters)
      setSelectedChapter(data)
      setChapterTitle(data.heading)
      setChapterContent(data.content || '')
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
  const saveChapter = async (isAutoSave = false) => {
    if (!selectedChapter) return

    if (!isAutoSave) {
      setSaving(true)
    }
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

      // Update save status
      setLastSaved(new Date())
      setHasUnsavedChanges(false)

      if (isAutoSave) {
        setSuccess('Auto-saved')
        // Clear success message after 3 seconds for autosave
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setSuccess('Chapter saved successfully')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to save chapter')
    } finally {
      if (!isAutoSave) {
        setSaving(false)
      }
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
      const newChapters = chapters.filter(ch => ch.id !== chapterId)
      setChapters(newChapters)
      addToHistory(newChapters)

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

  // Add to history (for undo/redo)
  const addToHistory = (newChapters: Chapter[]) => {
    // Remove any future history if we're not at the end
    const newHistory = chaptersHistory.slice(0, historyIndex + 1)
    newHistory.push(newChapters)
    setChaptersHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Undo action
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setChapters(chaptersHistory[newIndex])
      setSuccess('Undo successful')
    }
  }

  // Redo action
  const redo = () => {
    if (historyIndex < chaptersHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setChapters(chaptersHistory[newIndex])
      setSuccess('Redo successful')
    }
  }

  // Revision handlers
  const handleViewRevision = (revision: any) => {
    setViewingRevision(revision)
  }

  const handleCompareRevisions = (revA: any, revB: any) => {
    setComparingRevisions({ revA, revB })
  }

  const handleRestoreRevision = (revision: any) => {
    setRestoringRevision(revision)
  }

  const handleRestoreSuccess = () => {
    setRestoringRevision(null)
    setSuccess('Revision restored successfully. Page will reload.')
    setTimeout(() => {
      router.refresh()
    }, 2000)
  }

  // Move chapter up in order
  const moveChapterUp = async (chapterId: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId)
    if (!chapter) return

    // Find siblings at the same level
    const siblings = chapters
      .filter(ch => ch.parent_id === chapter.parent_id)
      .sort((a, b) => a.display_order - b.display_order)

    const currentIndex = siblings.findIndex(ch => ch.id === chapterId)
    if (currentIndex <= 0) return // Can't move up if first

    try {
      // Swap display_order with previous sibling
      const prevSibling = siblings[currentIndex - 1]
      const tempOrder = chapter.display_order

      // Update in database
      await supabase.from('chapters').update({
        display_order: prevSibling.display_order,
        updated_at: new Date().toISOString()
      }).eq('id', chapter.id)

      await supabase.from('chapters').update({
        display_order: tempOrder,
        updated_at: new Date().toISOString()
      }).eq('id', prevSibling.id)

      const reorderedChapters = chapters.map(ch => {
        if (ch.id === chapter.id) {
          return { ...ch, display_order: prevSibling.display_order }
        }
        if (ch.id === prevSibling.id) {
          return { ...ch, display_order: tempOrder }
        }
        return ch
      })

      const normalizedChapters = await normalizeChapterOrdering(reorderedChapters)

      setChapters(normalizedChapters)
      addToHistory(normalizedChapters)

      if (selectedChapter) {
        const updatedSelection = normalizedChapters.find(
          ch => ch.id === selectedChapter.id
        )
        if (updatedSelection) {
          setSelectedChapter(updatedSelection)
        }
      }
      setSuccess('Chapter moved up')
    } catch (error: any) {
      setError(error.message || 'Failed to move chapter')
    }
  }

  // Move chapter down in order
  const moveChapterDown = async (chapterId: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId)
    if (!chapter) return

    // Find siblings at the same level
    const siblings = chapters
      .filter(ch => ch.parent_id === chapter.parent_id)
      .sort((a, b) => a.display_order - b.display_order)

    const currentIndex = siblings.findIndex(ch => ch.id === chapterId)
    if (currentIndex >= siblings.length - 1) return // Can't move down if last

    try {
      // Swap display_order with next sibling
      const nextSibling = siblings[currentIndex + 1]
      const tempOrder = chapter.display_order

      // Update in database
      await supabase.from('chapters').update({
        display_order: nextSibling.display_order,
        updated_at: new Date().toISOString()
      }).eq('id', chapter.id)

      await supabase.from('chapters').update({
        display_order: tempOrder,
        updated_at: new Date().toISOString()
      }).eq('id', nextSibling.id)

      const reorderedChapters = chapters.map(ch => {
        if (ch.id === chapter.id) {
          return { ...ch, display_order: nextSibling.display_order }
        }
        if (ch.id === nextSibling.id) {
          return { ...ch, display_order: tempOrder }
        }
        return ch
      })

      const normalizedChapters = await normalizeChapterOrdering(reorderedChapters)

      setChapters(normalizedChapters)
      addToHistory(normalizedChapters)

      if (selectedChapter) {
        const updatedSelection = normalizedChapters.find(
          ch => ch.id === selectedChapter.id
        )
        if (updatedSelection) {
          setSelectedChapter(updatedSelection)
        }
      }
      setSuccess('Chapter moved down')
    } catch (error: any) {
      setError(error.message || 'Failed to move chapter')
    }
  }

  // Check if can move up
  const canMoveUp = (chapterId: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId)
    if (!chapter || chapter.chapter_number === 0) return false

    const siblings = chapters
      .filter(ch => ch.parent_id === chapter.parent_id)
      .sort((a, b) => a.display_order - b.display_order)

    const currentIndex = siblings.findIndex(ch => ch.id === chapterId)
    return currentIndex > 0
  }

  // Check if can move down
  const canMoveDown = (chapterId: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId)
    if (!chapter || chapter.chapter_number === 0) return false

    const siblings = chapters
      .filter(ch => ch.parent_id === chapter.parent_id)
      .sort((a, b) => a.display_order - b.display_order)

    const currentIndex = siblings.findIndex(ch => ch.id === chapterId)
    return currentIndex < siblings.length - 1
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
            {reorderMode && chapter.chapter_number !== 0 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    moveChapterUp(chapter.id)
                  }}
                  className={`p-1 hover:bg-gray-200 rounded ${!canMoveUp(chapter.id) ? 'opacity-40 cursor-not-allowed' : ''}`}
                  title="Move up"
                  disabled={!canMoveUp(chapter.id)}
                >
                  <MoveUp className="h-3 w-3 text-gray-500" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    moveChapterDown(chapter.id)
                  }}
                  className={`p-1 hover:bg-gray-200 rounded ${!canMoveDown(chapter.id) ? 'opacity-40 cursor-not-allowed' : ''}`}
                  title="Move down"
                  disabled={!canMoveDown(chapter.id)}
                >
                  <MoveDown className="h-3 w-3 text-gray-500" />
                </button>
              </>
            )}
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
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <GitBranch className="h-3 w-3" />
                  Rev {manual.current_revision}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  manual.status === 'draft' ? 'bg-orange-100 text-orange-800' :
                  manual.status === 'in_review' ? 'bg-yellow-100 text-yellow-800' :
                  manual.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {manual.status.replace('_', ' ').toUpperCase()}
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
          {!readOnly && (
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
          )}
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

      {/* Read-only banner */}
      {readOnly && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-blue-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                View-Only Mode
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                This manual is {manual.status === 'approved' ? 'approved' : 'in review'} and cannot be edited.
                {manual.status === 'approved' && ' To make changes, create a new draft revision.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b bg-white px-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('editor')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'editor'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Book className="h-4 w-4" />
            Editor
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="h-4 w-4" />
            Revision History
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="h-4 w-4" />
            Audit Trail
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Tab */}
        {activeTab === 'editor' && (
          <>
        {/* Chapter navigation sidebar */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Chapters</h2>
              <button
                onClick={() => addChapter(null)}
                className="p-1.5 hover:bg-gray-100 rounded"
                title="Add chapter"
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setReorderMode(!reorderMode)}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  reorderMode
                    ? 'bg-docgen-blue text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {reorderMode ? 'Done Reordering' : 'Reorder Chapters'}
              </button>
              {reorderMode && (
                <>
                  <button
                    onClick={undo}
                    disabled={historyIndex === 0}
                    className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Undo"
                  >
                    <Undo2 className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex === chaptersHistory.length - 1}
                    className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Redo"
                  >
                    <Redo2 className="h-4 w-4 text-gray-600" />
                  </button>
                </>
              )}
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
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      {hasUnsavedChanges && (
                        <span className="text-yellow-600 font-medium">Unsaved changes</span>
                      )}
                      {!hasUnsavedChanges && lastSaved && (
                        <span className="text-green-600">
                          Last saved {lastSaved.toLocaleTimeString()}
                        </span>
                      )}
                      <span className="ml-2">• Auto-saves every 30 seconds</span>
                    </div>
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
                      onClick={() => saveChapter(false)}
                      disabled={saving || !hasUnsavedChanges}
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
                          Save Now
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
                  <RichTextEditor
                    content={chapterContent}
                    onChange={setChapterContent}
                    placeholder="Enter chapter content..."
                    readOnly={readOnly}
                  />
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <span>Use the toolbar above to format your content. Tables, images, and links are supported.</span>
                  </div>
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
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
            <RevisionHistory
              manualId={manual.id}
              currentRevision={manual.current_revision}
              onViewRevision={handleViewRevision}
              onRestoreRevision={handleRestoreRevision}
              onCompareRevisions={handleCompareRevisions}
            />
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
            <AuditTrail manualId={manual.id} />
          </div>
        )}
      </div>

      {/* Modals and Overlays */}
      {viewingRevision && (
        <div className="fixed inset-0 bg-white z-50">
          <RevisionViewer
            revisionId={viewingRevision.id}
            manualId={manual.id}
            onClose={() => setViewingRevision(null)}
            onCompareWithCurrent={() => {
              // Get current manual state as a revision object
              const currentRevision = {
                id: 'current',
                revision_number: manual.current_revision,
                snapshot: { manual: { ...manual, chapters } },
                created_at: new Date().toISOString(),
                created_by_user: manual.created_by_user,
              }
              handleCompareRevisions(viewingRevision, currentRevision)
              setViewingRevision(null)
            }}
          />
        </div>
      )}

      {comparingRevisions && (
        <DiffViewer
          revisionA={comparingRevisions.revA}
          revisionB={comparingRevisions.revB}
          onClose={() => setComparingRevisions(null)}
        />
      )}

      {restoringRevision && (
        <RestoreModal
          revision={restoringRevision}
          manualId={manual.id}
          onClose={() => setRestoringRevision(null)}
          onSuccess={handleRestoreSuccess}
        />
      )}
    </div>
  )
}
