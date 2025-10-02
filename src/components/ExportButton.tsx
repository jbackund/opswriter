'use client'

import { useState } from 'react'
import { Download, Loader2, FileText, FileDiff } from 'lucide-react'

interface ExportButtonProps {
  manualId: string
  manualStatus: string
  manualCode: string
  currentRevision: string
}

export default function ExportButton({
  manualId,
  manualStatus,
  manualCode,
  currentRevision
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (exportType: 'clean' | 'watermarked' | 'diff') => {
    setIsExporting(true)
    setError(null)
    setShowMenu(false)

    try {
      const includeWatermark = exportType === 'watermarked' ||
                               (manualStatus === 'draft' && exportType !== 'diff')

      const response = await fetch(`/api/manuals/${manualId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exportType,
          includeWatermark,
        }),
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const data = await response.json()

      if (data.downloadUrl) {
        // Trigger download
        const link = document.createElement('a')
        link.href = data.downloadUrl
        link.download = data.fileName || `${manualCode}_${currentRevision}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.error('Export error:', err)
      setError('Failed to generate PDF export. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-docgen-blue hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-docgen-blue disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </>
        )}
      </button>

      {showMenu && !isExporting && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu">
            <button
              onClick={() => handleExport('clean')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              <FileText className="h-4 w-4 mr-3" />
              <div className="text-left">
                <div className="font-medium">Clean Export</div>
                <div className="text-xs text-gray-500">
                  {manualStatus === 'approved' ? 'Official approved version' : 'Current version'}
                </div>
              </div>
            </button>

            {manualStatus === 'draft' && (
              <>
                <button
                  onClick={() => handleExport('watermarked')}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  <FileText className="h-4 w-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Draft with Watermark</div>
                    <div className="text-xs text-gray-500">Shows DRAFT overlay</div>
                  </div>
                </button>

                <button
                  onClick={() => handleExport('diff')}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  <FileDiff className="h-4 w-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Draft with Changes</div>
                    <div className="text-xs text-gray-500">Highlights additions/removals</div>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute right-0 mt-2 w-64 rounded-md bg-red-50 p-4 shadow-lg">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-800 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
