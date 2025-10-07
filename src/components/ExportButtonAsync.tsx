'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, Loader2, FileText, FileDiff, CheckCircle, XCircle, Clock } from 'lucide-react'

interface ExportButtonAsyncProps {
  manualId: string
  manualStatus: string
  manualCode: string
  currentRevision: string
  useAsync?: boolean // Enable async export
}

interface ExportJob {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  downloadUrl?: string
  fileName?: string
  errorMessage?: string
}

export default function ExportButtonAsync({
  manualId,
  manualStatus,
  manualCode,
  currentRevision,
  useAsync = true, // Default to async mode
}: ExportButtonAsyncProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportJob, setExportJob] = useState<ExportJob | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Poll for job status
  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(
        `/api/manuals/${manualId}/export-async?jobId=${jobId}`
      )

      if (!response.ok) {
        throw new Error('Failed to check job status')
      }

      const data = await response.json()
      setExportJob(data)

      // If job is completed or failed, stop polling
      if (data.status === 'completed' || data.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        setIsExporting(false)

        // If completed, trigger download
        if (data.status === 'completed' && data.downloadUrl) {
          triggerDownload(data.downloadUrl, data.fileName)
        }

        // If failed, show error
        if (data.status === 'failed') {
          setError(data.errorMessage || 'Export failed')
        }
      }

      // Stop polling after 60 attempts (5 minutes at 5-second intervals)
      if (pollCount >= 60) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        setIsExporting(false)
        setError('Export timed out. Please try again.')
      }

      setPollCount(prev => prev + 1)
    } catch (err) {
      console.error('Poll error:', err)
      setError('Failed to check export status')
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      setIsExporting(false)
    }
  }

  const triggerDownload = (url: string, fileName: string) => {
    const newTab = window.open(url, '_blank', 'noopener,noreferrer')

    if (!newTab) {
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      if (fileName) {
        link.download = fileName
      }
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleExport = async (exportType: 'clean' | 'watermarked' | 'diff') => {
    setIsExporting(true)
    setError(null)
    setExportJob(null)
    setPollCount(0)
    setShowMenu(false)

    try {
      const includeWatermark = exportType === 'watermarked' ||
                               (manualStatus === 'draft' && exportType !== 'diff')

      const endpoint = useAsync
        ? `/api/manuals/${manualId}/export-async`
        : `/api/manuals/${manualId}/export`

      const response = await fetch(endpoint, {
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

      if (useAsync) {
        // Start polling for job status
        setExportJob({
          jobId: data.jobId,
          status: 'pending',
        })

        // Poll every 5 seconds
        pollIntervalRef.current = setInterval(() => {
          pollJobStatus(data.jobId)
        }, 5000)

        // Initial poll immediately
        pollJobStatus(data.jobId)
      } else {
        // Sync mode - download immediately
        if (data.downloadUrl) {
          triggerDownload(data.downloadUrl, data.fileName)
        }
        setIsExporting(false)
      }
    } catch (err) {
      console.error('Export error:', err)
      setError('Failed to generate PDF export. Please try again.')
      setIsExporting(false)
    }
  }

  const getJobStatusIcon = () => {
    if (!exportJob) return null

    switch (exportJob.status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getJobStatusText = () => {
    if (!exportJob) return 'Initializing...'

    switch (exportJob.status) {
      case 'pending':
        return 'Queued for processing...'
      case 'processing':
        return 'Generating PDF...'
      case 'completed':
        return 'Export completed!'
      case 'failed':
        return 'Export failed'
      default:
        return 'Unknown status'
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

      {/* Job Status Display */}
      {isExporting && exportJob && (
        <div className="absolute right-0 mt-2 w-64 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 p-4">
          <div className="flex items-center gap-2">
            {getJobStatusIcon()}
            <span className="text-sm font-medium">{getJobStatusText()}</span>
          </div>
          {exportJob.status === 'processing' && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full animate-pulse"
                  style={{ width: '60%' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This may take a few minutes for large manuals...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Export Options Menu */}
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

      {/* Error Display */}
      {error && (
        <div className="absolute right-0 mt-2 w-64 rounded-md bg-red-50 p-4 shadow-lg">
          <div className="flex">
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-800 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
