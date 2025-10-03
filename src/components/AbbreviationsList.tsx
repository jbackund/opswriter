'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  Globe,
  Building,
  X,
  Save,
  Loader2
} from 'lucide-react'

interface UserProfile {
  id: string
  full_name: string
  email: string
}

interface Abbreviation {
  id: string
  abbreviation: string
  full_text: string
  is_global: boolean
  organization_name: string | null
  created_at: string
  updated_at: string
  created_by: string
  created_by_user?: UserProfile
}

interface AbbreviationsListProps {
  initialAbbreviations: Abbreviation[]
}

type SortField = 'abbreviation' | 'full_text' | 'is_global' | 'organization_name' | 'updated_at'
type SortDirection = 'asc' | 'desc'

export default function AbbreviationsList({ initialAbbreviations }: AbbreviationsListProps) {
  const [abbreviations, setAbbreviations] = useState<Abbreviation[]>(initialAbbreviations)
  const [searchQuery, setSearchQuery] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'organization'>('all')
  const [sortField, setSortField] = useState<SortField>('abbreviation')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedAbbreviation, setSelectedAbbreviation] = useState<Abbreviation | null>(null)

  // Form states
  const [formAbbreviation, setFormAbbreviation] = useState('')
  const [formFullText, setFormFullText] = useState('')
  const [formIsGlobal, setFormIsGlobal] = useState(true)
  const [formOrganization, setFormOrganization] = useState('Heli Air Sweden')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Filter and sort abbreviations
  const filteredAndSortedAbbreviations = useMemo(() => {
    let filtered = [...abbreviations]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(abbr =>
        abbr.abbreviation.toLowerCase().includes(query) ||
        abbr.full_text.toLowerCase().includes(query) ||
        (abbr.organization_name || '').toLowerCase().includes(query)
      )
    }

    // Scope filter
    if (scopeFilter === 'global') {
      filtered = filtered.filter(abbr => abbr.is_global)
    } else if (scopeFilter === 'organization') {
      filtered = filtered.filter(abbr => !abbr.is_global)
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof Abbreviation]
      let bVal: any = b[sortField as keyof Abbreviation]

      if (aVal === null) aVal = ''
      if (bVal === null) bVal = ''

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }, [abbreviations, searchQuery, scopeFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const openAddModal = () => {
    setFormAbbreviation('')
    setFormFullText('')
    setFormIsGlobal(true)
    setFormOrganization('Heli Air Sweden')
    setError(null)
    setShowAddModal(true)
  }

  const openEditModal = (abbreviation: Abbreviation) => {
    setSelectedAbbreviation(abbreviation)
    setFormAbbreviation(abbreviation.abbreviation)
    setFormFullText(abbreviation.full_text)
    setFormIsGlobal(abbreviation.is_global)
    setFormOrganization(abbreviation.organization_name || 'Heli Air Sweden')
    setError(null)
    setShowEditModal(true)
  }

  const openDeleteModal = (abbreviation: Abbreviation) => {
    setSelectedAbbreviation(abbreviation)
    setShowDeleteModal(true)
  }

  const handleAdd = async () => {
    if (!formAbbreviation.trim() || !formFullText.trim()) {
      setError('Abbreviation and full text are required')
      return
    }

    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in')
      setLoading(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('abbreviations')
      .insert({
        abbreviation: formAbbreviation.trim().toUpperCase(),
        full_text: formFullText.trim(),
        is_global: formIsGlobal,
        organization_name: formIsGlobal ? null : formOrganization,
        created_by: user.id
      })
      .select('*')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setAbbreviations([...abbreviations, data])
    setShowAddModal(false)
    setLoading(false)
  }

  const handleEdit = async () => {
    if (!selectedAbbreviation) return
    if (!formAbbreviation.trim() || !formFullText.trim()) {
      setError('Abbreviation and full text are required')
      return
    }

    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in')
      setLoading(false)
      return
    }

    const { data, error: updateError } = await supabase
      .from('abbreviations')
      .update({
        abbreviation: formAbbreviation.trim().toUpperCase(),
        full_text: formFullText.trim(),
        is_global: formIsGlobal,
        organization_name: formIsGlobal ? null : formOrganization,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedAbbreviation.id)
      .select('*')
      .single()

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setAbbreviations(abbreviations.map(abbr => abbr.id === selectedAbbreviation.id ? data : abbr))
    setShowEditModal(false)
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!selectedAbbreviation) return

    setLoading(true)

    const { error: deleteError } = await supabase
      .from('abbreviations')
      .delete()
      .eq('id', selectedAbbreviation.id)

    if (deleteError) {
      setError(deleteError.message)
      setLoading(false)
      return
    }

    setAbbreviations(abbreviations.filter(abbr => abbr.id !== selectedAbbreviation.id))
    setShowDeleteModal(false)
    setLoading(false)
  }

  return (
    <>
      <div className="mt-8">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search abbreviations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
          >
            <option value="all">All Scopes</option>
            <option value="global">Global Only</option>
            <option value="organization">Organization Only</option>
          </select>

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-docgen-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-docgen-blue focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Abbreviation
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('abbreviation')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Abbreviation</span>
                    {sortField === 'abbreviation' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('full_text')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Full Text</span>
                    {sortField === 'full_text' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('is_global')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Scope</span>
                    {sortField === 'is_global' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('updated_at')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Last Updated</span>
                    {sortField === 'updated_at' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedAbbreviations.map((abbreviation) => (
                <tr key={abbreviation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {abbreviation.abbreviation}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">
                      {abbreviation.full_text}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      {abbreviation.is_global ? (
                        <>
                          <Globe className="h-4 w-4 mr-1 text-blue-500" />
                          <span>Global</span>
                        </>
                      ) : (
                        <>
                          <Building className="h-4 w-4 mr-1 text-green-500" />
                          <span>{abbreviation.organization_name}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(abbreviation.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(abbreviation)}
                      className="text-docgen-blue hover:text-blue-700 mr-3"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(abbreviation)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedAbbreviations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No abbreviations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Abbreviation</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Abbreviation
                </label>
                <input
                  type="text"
                  value={formAbbreviation}
                  onChange={(e) => setFormAbbreviation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
                  placeholder="e.g., API"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Text
                </label>
                <input
                  type="text"
                  value={formFullText}
                  onChange={(e) => setFormFullText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
                  placeholder="e.g., Application Programming Interface"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scope
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={formIsGlobal}
                      onChange={() => setFormIsGlobal(true)}
                      className="mr-2"
                    />
                    <Globe className="h-4 w-4 mr-1 text-blue-500" />
                    <span>Global (Available to all organizations)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!formIsGlobal}
                      onChange={() => setFormIsGlobal(false)}
                      className="mr-2"
                    />
                    <Building className="h-4 w-4 mr-1 text-green-500" />
                    <span>Organization-specific</span>
                  </label>
                </div>
              </div>

              {!formIsGlobal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={formOrganization}
                    onChange={(e) => setFormOrganization(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 text-sm font-medium text-white bg-docgen-blue rounded-lg hover:opacity-90 flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Add Abbreviation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Abbreviation</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Abbreviation
                </label>
                <input
                  type="text"
                  value={formAbbreviation}
                  onChange={(e) => setFormAbbreviation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
                  placeholder="e.g., API"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Text
                </label>
                <input
                  type="text"
                  value={formFullText}
                  onChange={(e) => setFormFullText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
                  placeholder="e.g., Application Programming Interface"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scope
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={formIsGlobal}
                      onChange={() => setFormIsGlobal(true)}
                      className="mr-2"
                    />
                    <Globe className="h-4 w-4 mr-1 text-blue-500" />
                    <span>Global (Available to all organizations)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!formIsGlobal}
                      onChange={() => setFormIsGlobal(false)}
                      className="mr-2"
                    />
                    <Building className="h-4 w-4 mr-1 text-green-500" />
                    <span>Organization-specific</span>
                  </label>
                </div>
              </div>

              {!formIsGlobal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={formOrganization}
                    onChange={(e) => setFormOrganization(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-docgen-blue rounded-lg hover:opacity-90 flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAbbreviation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Delete Abbreviation</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Are you sure you want to delete the abbreviation &ldquo;<strong>{selectedAbbreviation.abbreviation}</strong>&rdquo; ({selectedAbbreviation.full_text})?
              This action cannot be undone.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
