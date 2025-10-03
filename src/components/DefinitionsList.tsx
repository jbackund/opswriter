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

interface Definition {
  id: string
  term: string
  definition: string
  is_global: boolean
  organization_name: string | null
  created_at: string
  updated_at: string
  created_by: string
  created_by_user?: UserProfile
}

interface DefinitionsListProps {
  initialDefinitions: Definition[]
}

type SortField = 'term' | 'definition' | 'is_global' | 'organization_name' | 'updated_at'
type SortDirection = 'asc' | 'desc'

export default function DefinitionsList({ initialDefinitions }: DefinitionsListProps) {
  const [definitions, setDefinitions] = useState<Definition[]>(initialDefinitions)
  const [searchQuery, setSearchQuery] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'organization'>('all')
  const [sortField, setSortField] = useState<SortField>('term')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedDefinition, setSelectedDefinition] = useState<Definition | null>(null)

  // Form states
  const [formTerm, setFormTerm] = useState('')
  const [formDefinition, setFormDefinition] = useState('')
  const [formIsGlobal, setFormIsGlobal] = useState(true)
  const [formOrganization, setFormOrganization] = useState('Heli Air Sweden')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Filter and sort definitions
  const filteredAndSortedDefinitions = useMemo(() => {
    let filtered = [...definitions]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(def =>
        def.term.toLowerCase().includes(query) ||
        def.definition.toLowerCase().includes(query) ||
        (def.organization_name || '').toLowerCase().includes(query)
      )
    }

    // Scope filter
    if (scopeFilter === 'global') {
      filtered = filtered.filter(def => def.is_global)
    } else if (scopeFilter === 'organization') {
      filtered = filtered.filter(def => !def.is_global)
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof Definition]
      let bVal: any = b[sortField as keyof Definition]

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
  }, [definitions, searchQuery, scopeFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const openAddModal = () => {
    setFormTerm('')
    setFormDefinition('')
    setFormIsGlobal(true)
    setFormOrganization('Heli Air Sweden')
    setError(null)
    setShowAddModal(true)
  }

  const openEditModal = (definition: Definition) => {
    setSelectedDefinition(definition)
    setFormTerm(definition.term)
    setFormDefinition(definition.definition)
    setFormIsGlobal(definition.is_global)
    setFormOrganization(definition.organization_name || 'Heli Air Sweden')
    setError(null)
    setShowEditModal(true)
  }

  const openDeleteModal = (definition: Definition) => {
    setSelectedDefinition(definition)
    setShowDeleteModal(true)
  }

  const handleAdd = async () => {
    if (!formTerm.trim() || !formDefinition.trim()) {
      setError('Term and definition are required')
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
      .from('definitions')
      .insert({
        term: formTerm.trim(),
        definition: formDefinition.trim(),
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

    setDefinitions([...definitions, data])
    setShowAddModal(false)
    setLoading(false)
  }

  const handleEdit = async () => {
    if (!selectedDefinition) return
    if (!formTerm.trim() || !formDefinition.trim()) {
      setError('Term and definition are required')
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
      .from('definitions')
      .update({
        term: formTerm.trim(),
        definition: formDefinition.trim(),
        is_global: formIsGlobal,
        organization_name: formIsGlobal ? null : formOrganization,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedDefinition.id)
      .select('*')
      .single()

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDefinitions(definitions.map(def => def.id === selectedDefinition.id ? data : def))
    setShowEditModal(false)
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!selectedDefinition) return

    setLoading(true)

    const { error: deleteError } = await supabase
      .from('definitions')
      .delete()
      .eq('id', selectedDefinition.id)

    if (deleteError) {
      setError(deleteError.message)
      setLoading(false)
      return
    }

    setDefinitions(definitions.filter(def => def.id !== selectedDefinition.id))
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
                placeholder="Search definitions..."
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
            Add Definition
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('term')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Term</span>
                    {sortField === 'term' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('definition')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Definition</span>
                    {sortField === 'definition' && (
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
              {filteredAndSortedDefinitions.map((definition) => (
                <tr key={definition.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {definition.term}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">
                      {definition.definition}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      {definition.is_global ? (
                        <>
                          <Globe className="h-4 w-4 mr-1 text-blue-500" />
                          <span>Global</span>
                        </>
                      ) : (
                        <>
                          <Building className="h-4 w-4 mr-1 text-green-500" />
                          <span>{definition.organization_name}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(definition.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(definition)}
                      className="text-docgen-blue hover:text-blue-700 mr-3"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(definition)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedDefinitions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No definitions found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Definition</h2>
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
                  Term
                </label>
                <input
                  type="text"
                  value={formTerm}
                  onChange={(e) => setFormTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
                  placeholder="Enter the term"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Definition
                </label>
                <textarea
                  value={formDefinition}
                  onChange={(e) => setFormDefinition(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
                  placeholder="Enter the definition"
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
                    Add Definition
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
              <h2 className="text-xl font-semibold">Edit Definition</h2>
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
                  Term
                </label>
                <input
                  type="text"
                  value={formTerm}
                  onChange={(e) => setFormTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
                  placeholder="Enter the term"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Definition
                </label>
                <textarea
                  value={formDefinition}
                  onChange={(e) => setFormDefinition(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
                  placeholder="Enter the definition"
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
      {showDeleteModal && selectedDefinition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Delete Definition</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Are you sure you want to delete the definition for "<strong>{selectedDefinition.term}</strong>"?
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