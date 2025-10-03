'use client'

import { useState, useEffect, useCallback } from 'react'
import { GitCompare, X, Check, Minus, Plus, AlertCircle } from 'lucide-react'

interface Revision {
  id: string
  revision_number: string
  snapshot: any
  created_at: string
  created_by_user: {
    full_name: string
  }
}

interface DiffViewerProps {
  revisionA: Revision
  revisionB: Revision
  onClose: () => void
}

interface FieldDiff {
  field: string
  oldValue: any
  newValue: any
  type: 'added' | 'removed' | 'modified' | 'unchanged'
}

export default function DiffViewer({ revisionA, revisionB, onClose }: DiffViewerProps) {
  const [manualDiffs, setManualDiffs] = useState<FieldDiff[]>([])
  const [chapterDiffs, setChapterDiffs] = useState<any[]>([])
  const [selectedTab, setSelectedTab] = useState<'manual' | 'chapters'>('manual')

  const calculateDiffs = useCallback(() => {
    const manualA = revisionA.snapshot?.manual
    const manualB = revisionB.snapshot?.manual

    // Calculate manual metadata diffs
    const metadataFields = [
      'title',
      'description',
      'organization_name',
      'manual_code',
      'status',
      'effective_date',
      'review_due_date',
    ]

    const diffs: FieldDiff[] = metadataFields.map((field) => {
      const oldVal = manualA?.[field]
      const newVal = manualB?.[field]

      if (oldVal === newVal || (oldVal == null && newVal == null)) {
        return { field, oldValue: oldVal, newValue: newVal, type: 'unchanged' }
      }
      if (oldVal == null && newVal != null) {
        return { field, oldValue: oldVal, newValue: newVal, type: 'added' }
      }
      if (oldVal != null && newVal == null) {
        return { field, oldValue: oldVal, newValue: newVal, type: 'removed' }
      }
      return { field, oldValue: oldVal, newValue: newVal, type: 'modified' }
    })

    setManualDiffs(diffs)

    // Calculate chapter diffs
    const chaptersA = manualA?.chapters || []
    const chaptersB = manualB?.chapters || []

    const chapterMap = new Map()

    const buildChapterKey = (ch: any) =>
      [ch.chapter_number, ch.section_number, ch.subsection_number, ch.clause_number]
        .filter(value => value !== null && value !== undefined)
        .join('.')

    // Process chapters from A
    chaptersA.forEach((ch: any) => {
      const key = buildChapterKey(ch)
      chapterMap.set(key, { old: ch, new: null })
    })

    // Process chapters from B
    chaptersB.forEach((ch: any) => {
      const key = buildChapterKey(ch)
      if (chapterMap.has(key)) {
        chapterMap.get(key).new = ch
      } else {
        chapterMap.set(key, { old: null, new: ch })
      }
    })

    const chapterDiffsList = Array.from(chapterMap.entries()).map(([key, value]) => {
      const { old, new: newCh } = value

      if (!old && newCh) {
        return { key, type: 'added', old: null, new: newCh }
      }
      if (old && !newCh) {
        return { key, type: 'removed', old, new: null }
      }

      // Check for modifications
      const headingChanged = old.heading !== newCh.heading
      const pageBreakChanged = old.page_break !== newCh.page_break
      const contentChanged = JSON.stringify(old.content_blocks) !== JSON.stringify(newCh.content_blocks)

      if (headingChanged || pageBreakChanged || contentChanged) {
        return {
          key,
          type: 'modified',
          old,
          new: newCh,
          changes: {
            heading: headingChanged,
            pageBreak: pageBreakChanged,
            content: contentChanged,
          },
        }
      }

      return { key, type: 'unchanged', old, new: newCh }
    })

    setChapterDiffs(chapterDiffsList)
  }, [revisionA, revisionB])

  useEffect(() => {
    calculateDiffs()
  }, [calculateDiffs])

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-gray-400 italic">null</span>
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      try {
        return new Date(value).toLocaleDateString()
      } catch {
        return String(value)
      }
    }
    return String(value)
  }

  const getFieldLabel = (field: string) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const renderManualDiffs = () => {
    const changedFields = manualDiffs.filter((d) => d.type !== 'unchanged')

    if (changedFields.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Check className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
          <p>No changes in manual metadata</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {changedFields.map((diff) => (
          <div
            key={diff.field}
            className={`border rounded-lg p-4 ${
              diff.type === 'added'
                ? 'bg-green-50 border-green-200'
                : diff.type === 'removed'
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {diff.type === 'added' && <Plus className="h-4 w-4 text-green-600" />}
              {diff.type === 'removed' && <Minus className="h-4 w-4 text-red-600" />}
              {diff.type === 'modified' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
              <h3 className="font-semibold text-gray-900">{getFieldLabel(diff.field)}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600 font-medium mb-1">
                  Revision {revisionA.revision_number}:
                </div>
                <div
                  className={`p-2 rounded ${
                    diff.type === 'removed' || diff.type === 'modified'
                      ? 'bg-red-100 text-red-900 line-through'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {formatValue(diff.oldValue)}
                </div>
              </div>
              <div>
                <div className="text-gray-600 font-medium mb-1">
                  Revision {revisionB.revision_number}:
                </div>
                <div
                  className={`p-2 rounded ${
                    diff.type === 'added' || diff.type === 'modified'
                      ? 'bg-green-100 text-green-900 font-medium'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {formatValue(diff.newValue)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderChapterDiffs = () => {
    const changedChapters = chapterDiffs.filter((d) => d.type !== 'unchanged')

    if (changedChapters.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Check className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
          <p>No changes in chapters</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {changedChapters.map((diff) => (
          <div
            key={diff.key}
            className={`border rounded-lg p-4 ${
              diff.type === 'added'
                ? 'bg-green-50 border-green-200'
                : diff.type === 'removed'
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              {diff.type === 'added' && <Plus className="h-5 w-5 text-green-600" />}
              {diff.type === 'removed' && <Minus className="h-5 w-5 text-red-600" />}
              {diff.type === 'modified' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
              <h3 className="font-semibold text-gray-900">
                {diff.type === 'added' && 'Added: '}
                {diff.type === 'removed' && 'Removed: '}
                {diff.type === 'modified' && 'Modified: '}
                Chapter {diff.key}
              </h3>
            </div>

            {diff.type === 'added' && (
              <div className="p-3 bg-green-100 rounded">
                <p className="font-medium text-green-900">{diff.new.heading}</p>
                {diff.new.page_break && (
                  <span className="text-xs text-green-700 mt-1 inline-block">Page Break: Yes</span>
                )}
              </div>
            )}

            {diff.type === 'removed' && (
              <div className="p-3 bg-red-100 rounded">
                <p className="font-medium text-red-900 line-through">{diff.old.heading}</p>
                {diff.old.page_break && (
                  <span className="text-xs text-red-700 mt-1 inline-block">Page Break: Yes</span>
                )}
              </div>
            )}

            {diff.type === 'modified' && (
              <div className="space-y-2">
                {diff.changes.heading && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-2 bg-red-100 rounded">
                      <p className="text-xs text-red-600 mb-1">Old Heading:</p>
                      <p className="text-sm text-red-900 line-through">{diff.old.heading}</p>
                    </div>
                    <div className="p-2 bg-green-100 rounded">
                      <p className="text-xs text-green-600 mb-1">New Heading:</p>
                      <p className="text-sm text-green-900 font-medium">{diff.new.heading}</p>
                    </div>
                  </div>
                )}
                {diff.changes.pageBreak && (
                  <div className="text-sm">
                    <span className="text-yellow-700">
                      Page Break: {diff.old.page_break ? 'Yes' : 'No'} → {diff.new.page_break ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
                {diff.changes.content && (
                  <div className="text-sm text-yellow-700">Content blocks modified</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitCompare className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Compare Revisions</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {revisionA.revision_number} vs {revisionB.revision_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedTab('manual')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === 'manual'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Manual Metadata
              {manualDiffs.filter((d) => d.type !== 'unchanged').length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                  {manualDiffs.filter((d) => d.type !== 'unchanged').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setSelectedTab('chapters')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === 'chapters'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Chapters
              {chapterDiffs.filter((d) => d.type !== 'unchanged').length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                  {chapterDiffs.filter((d) => d.type !== 'unchanged').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedTab === 'manual' ? renderManualDiffs() : renderChapterDiffs()}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 bg-gray-50 flex justify-between items-center text-sm text-gray-600">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <span>Added</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-200 rounded"></div>
              <span>Removed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-200 rounded"></div>
              <span>Modified</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
