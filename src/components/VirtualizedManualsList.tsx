'use client'

import { useCallback, useMemo, memo } from 'react'
import { FixedSizeList as List } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import { useManuals } from '@/hooks/useManuals'
import { useRouter } from 'next/navigation'
import { FileText, Edit, Eye, Download, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import ExportButtonAsync from './ExportButtonAsync'

interface Manual {
  id: string
  title: string
  description: string
  manual_code: string
  status: string
  current_revision: string
  effective_date: string | null
  revision_date: string | null
  organization_name: string
  created_by: string
  created_at: string
  updated_at: string
  tags: string[] | null
  created_by_user?: {
    full_name: string
    email: string
  }
}

interface VirtualizedManualsListProps {
  filters?: {
    status?: string
    owner?: string
    search?: string
  }
  height?: number
}

// Memoized row component for better performance
const ManualRow = memo(({ index, style, data }: {
  index: number
  style: React.CSSProperties
  data: {
    items: Manual[]
    onEdit: (id: string) => void
    onView: (id: string) => void
  }
}) => {
  const manual = data.items[index]
  const router = useRouter()

  if (!manual) {
    return (
      <div style={style} className="flex items-center px-6 py-4 border-b">
        <div className="animate-pulse flex space-x-4 w-full">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-orange-100 text-orange-800', icon: Edit },
      in_review: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: 'bg-gray-100 text-gray-800',
      icon: AlertCircle,
    }

    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    )
  }

  return (
    <div
      style={style}
      className="flex items-center px-6 py-4 border-b hover:bg-gray-50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-gray-400 mr-3" />
          <div className="flex-1">
            <button
              onClick={() => data.onView(manual.id)}
              className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block"
            >
              {manual.title}
            </button>
            <p className="text-sm text-gray-500 truncate">
              {manual.manual_code} • Rev {manual.current_revision}
              {manual.effective_date && ` • Effective: ${new Date(manual.effective_date).toLocaleDateString()}`}
              {manual.revision_date && ` • Revision: ${new Date(manual.revision_date).toLocaleDateString()}`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="text-sm text-gray-500">
          <p className="font-medium">{manual.created_by_user?.full_name || 'Unknown'}</p>
          <p className="text-xs">
            Updated {new Date(manual.updated_at).toLocaleDateString()}
          </p>
        </div>

        {getStatusBadge(manual.status)}

        <div className="flex items-center space-x-2">
          <button
            onClick={() => data.onView(manual.id)}
            className="p-1 hover:bg-gray-100 rounded"
            title="View"
          >
            <Eye className="h-4 w-4 text-gray-600" />
          </button>

          {(manual.status === 'draft' || manual.status === 'rejected') && (
            <button
              onClick={() => data.onEdit(manual.id)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Edit"
            >
              <Edit className="h-4 w-4 text-gray-600" />
            </button>
          )}

          <ExportButtonAsync
            manualId={manual.id}
            manualStatus={manual.status}
            manualCode={manual.manual_code}
            currentRevision={manual.current_revision}
          />
        </div>
      </div>
    </div>
  )
})

ManualRow.displayName = 'ManualRow'

export default function VirtualizedManualsList({
  filters,
  height = 600,
}: VirtualizedManualsListProps) {
  const router = useRouter()
  const { data: manuals, isLoading, isFetching, error } = useManuals(filters)

  const items = useMemo(() => manuals || [], [manuals])

  const handleEdit = useCallback((id: string) => {
    router.push(`/dashboard/manuals/${id}/edit`)
  }, [router])

  const handleView = useCallback((id: string) => {
    router.push(`/dashboard/manuals/${id}/view`)
  }, [router])

  // Item data passed to rows
  const itemData = useMemo(() => ({
    items,
    onEdit: handleEdit,
    onView: handleView,
  }), [items, handleEdit, handleView])

  // Check if more items need to be loaded
  const isItemLoaded = useCallback((index: number) => {
    return !!items[index]
  }, [items])

  // Load more items (for infinite scrolling if needed)
  const loadMoreItems = useCallback(async () => {
    // This would load more items if implementing pagination
    // For now, we load all items at once
    return Promise.resolve()
  }, [])

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-700">Failed to load manuals</p>
        <p className="text-sm text-gray-500 mt-2">{(error as Error).message}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-700 mt-4">Loading manuals...</p>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-700">No manuals found</p>
        <p className="text-sm text-gray-500 mt-2">
          {filters?.search
            ? 'Try adjusting your search terms'
            : 'Create your first manual to get started'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {isFetching && (
        <div className="absolute top-0 right-0 m-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={items.length}
        loadMoreItems={loadMoreItems}
      >
        {({ onItemsRendered, ref }) => (
          <List
            ref={ref}
            height={height}
            itemCount={items.length}
            itemSize={80} // Height of each row
            width="100%"
            onItemsRendered={onItemsRendered}
            itemData={itemData}
            overscanCount={5} // Render 5 extra items outside visible area
          >
            {ManualRow}
          </List>
        )}
      </InfiniteLoader>
    </div>
  )
}
