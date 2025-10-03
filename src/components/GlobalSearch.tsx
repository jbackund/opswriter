'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, FileText, Hash, Type, List, BookOpen, Loader2 } from 'lucide-react'

interface SearchResult {
  type: 'manual' | 'chapter' | 'content' | 'definition' | 'abbreviation'
  id: string
  title: string
  content: string
  manual_id?: string
  manual_title?: string
  rank: number
}

interface GroupedResults {
  manuals: SearchResult[]
  chapters: SearchResult[]
  content: SearchResult[]
  definitions: SearchResult[]
  abbreviations: SearchResult[]
}

export default function GlobalSearch() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GroupedResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results)
    } catch (err) {
      console.error('Search error:', err)
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle search input change with debouncing
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value)
    }, 300)
  }

  // Navigate to result
  const navigateToResult = (result: SearchResult) => {
    setIsOpen(false)
    setQuery('')
    setResults(null)

    switch (result.type) {
      case 'manual':
        router.push(`/dashboard/manuals/${result.id}/view`)
        break
      case 'chapter':
      case 'content':
        if (result.manual_id) {
          router.push(`/dashboard/manuals/${result.manual_id}/view#chapter-${result.id}`)
        }
        break
      case 'definition':
        router.push('/dashboard/references/definitions')
        break
      case 'abbreviation':
        router.push('/dashboard/references/abbreviations')
        break
    }
  }

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'manual':
        return <FileText className="w-4 h-4" />
      case 'chapter':
        return <Hash className="w-4 h-4" />
      case 'content':
        return <BookOpen className="w-4 h-4" />
      case 'definition':
        return <Type className="w-4 h-4" />
      case 'abbreviation':
        return <List className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  // Count total results
  const getTotalResults = () => {
    if (!results) return 0
    return (
      results.manuals.length +
      results.chapters.length +
      results.content.length +
      results.definitions.length +
      results.abbreviations.length
    )
  }

  return (
    <>
      {/* Search Button */}
      <button
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 100)
        }}
        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Search className="w-5 h-5" />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden md:inline px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black bg-opacity-50">
          <div
            ref={searchRef}
            className="w-full max-w-2xl bg-white rounded-lg shadow-xl"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleSearchChange}
                placeholder="Search manuals, chapters, definitions..."
                className="flex-1 outline-none text-gray-900 placeholder-gray-400"
              />
              {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
              <button
                onClick={() => {
                  setIsOpen(false)
                  setQuery('')
                  setResults(null)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Search Results */}
            {results && getTotalResults() > 0 && (
              <div className="max-h-96 overflow-y-auto">
                {/* Manuals */}
                {results.manuals.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                      Manuals
                    </div>
                    {results.manuals.map(result => (
                      <button
                        key={result.id}
                        onClick={() => navigateToResult(result)}
                        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-100 rounded text-left"
                      >
                        {getResultIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {result.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {result.content}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Chapters */}
                {results.chapters.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                      Chapters
                    </div>
                    {results.chapters.map(result => (
                      <button
                        key={result.id}
                        onClick={() => navigateToResult(result)}
                        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-100 rounded text-left"
                      >
                        {getResultIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {result.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            in {result.manual_title}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Content */}
                {results.content.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                      Content
                    </div>
                    {results.content.map(result => (
                      <button
                        key={result.id}
                        onClick={() => navigateToResult(result)}
                        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-100 rounded text-left"
                      >
                        {getResultIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {result.title}
                          </div>
                          <div className="text-sm text-gray-500 line-clamp-2">
                            {result.content}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            in {result.manual_title}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Definitions */}
                {results.definitions.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                      Definitions
                    </div>
                    {results.definitions.map(result => (
                      <button
                        key={result.id}
                        onClick={() => navigateToResult(result)}
                        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-100 rounded text-left"
                      >
                        {getResultIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {result.title}
                          </div>
                          <div className="text-sm text-gray-500 line-clamp-2">
                            {result.content}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Abbreviations */}
                {results.abbreviations.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                      Abbreviations
                    </div>
                    {results.abbreviations.map(result => (
                      <button
                        key={result.id}
                        onClick={() => navigateToResult(result)}
                        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-100 rounded text-left"
                      >
                        {getResultIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {result.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {result.content}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No Results */}
            {results && getTotalResults() === 0 && query.length >= 2 && (
              <div className="p-8 text-center text-gray-500">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 text-center text-red-600">
                {error}
              </div>
            )}

            {/* Initial State */}
            {!results && !loading && query.length < 2 && (
              <div className="p-8 text-center text-gray-400">
                Start typing to search...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
