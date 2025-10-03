'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  BookOpen,
  FileText,
  Check,
  X,
  Loader2,
  Globe,
  Building
} from 'lucide-react'

interface Definition {
  id: string
  term: string
  definition: string
  is_global: boolean
  organization_name: string | null
}

interface Abbreviation {
  id: string
  abbreviation: string
  full_text: string
  is_global: boolean
  organization_name: string | null
}

interface ManualReferencesSelectorProps {
  manualId: string
  organizationName?: string
  onUpdate?: () => void
}

export default function ManualReferencesSelector({
  manualId,
  organizationName = 'Heli Air Sweden',
  onUpdate
}: ManualReferencesSelectorProps) {
  const supabase = createClient()

  // State for definitions
  const [allDefinitions, setAllDefinitions] = useState<Definition[]>([])
  const [selectedDefinitionIds, setSelectedDefinitionIds] = useState<Set<string>>(new Set())
  const [definitionSearchQuery, setDefinitionSearchQuery] = useState('')
  const [definitionScopeFilter, setDefinitionScopeFilter] = useState<'all' | 'global' | 'organization'>('all')

  // State for abbreviations
  const [allAbbreviations, setAllAbbreviations] = useState<Abbreviation[]>([])
  const [selectedAbbreviationIds, setSelectedAbbreviationIds] = useState<Set<string>>(new Set())
  const [abbreviationSearchQuery, setAbbreviationSearchQuery] = useState('')
  const [abbreviationScopeFilter, setAbbreviationScopeFilter] = useState<'all' | 'global' | 'organization'>('all')

  // UI state
  const [activeTab, setActiveTab] = useState<'definitions' | 'abbreviations'>('definitions')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [manualId])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load all definitions
      const { data: definitions, error: defError } = await supabase
        .from('definitions')
        .select('*')
        .or(`is_global.eq.true,organization_name.eq.${organizationName}`)
        .order('term')

      if (defError) throw defError

      // Load all abbreviations
      const { data: abbreviations, error: abbrError } = await supabase
        .from('abbreviations')
        .select('*')
        .or(`is_global.eq.true,organization_name.eq.${organizationName}`)
        .order('abbreviation')

      if (abbrError) throw abbrError

      // Load selected definitions for this manual
      const { data: manualDefs, error: manualDefsError } = await supabase
        .from('manual_definitions')
        .select('definition_id')
        .eq('manual_id', manualId)

      if (manualDefsError) throw manualDefsError

      // Load selected abbreviations for this manual
      const { data: manualAbbrs, error: manualAbbrsError } = await supabase
        .from('manual_abbreviations')
        .select('abbreviation_id')
        .eq('manual_id', manualId)

      if (manualAbbrsError) throw manualAbbrsError

      setAllDefinitions(definitions || [])
      setAllAbbreviations(abbreviations || [])
      setSelectedDefinitionIds(new Set((manualDefs || []).map(md => md.definition_id)))
      setSelectedAbbreviationIds(new Set((manualAbbrs || []).map(ma => ma.abbreviation_id)))
    } catch (err) {
      console.error('Error loading references:', err)
      setError('Failed to load references')
    } finally {
      setLoading(false)
    }
  }

  // Filter definitions
  const filteredDefinitions = useMemo(() => {
    let filtered = [...allDefinitions]

    if (definitionSearchQuery) {
      const query = definitionSearchQuery.toLowerCase()
      filtered = filtered.filter(def =>
        def.term.toLowerCase().includes(query) ||
        def.definition.toLowerCase().includes(query)
      )
    }

    if (definitionScopeFilter === 'global') {
      filtered = filtered.filter(def => def.is_global)
    } else if (definitionScopeFilter === 'organization') {
      filtered = filtered.filter(def => !def.is_global)
    }

    return filtered
  }, [allDefinitions, definitionSearchQuery, definitionScopeFilter])

  // Filter abbreviations
  const filteredAbbreviations = useMemo(() => {
    let filtered = [...allAbbreviations]

    if (abbreviationSearchQuery) {
      const query = abbreviationSearchQuery.toLowerCase()
      filtered = filtered.filter(abbr =>
        abbr.abbreviation.toLowerCase().includes(query) ||
        abbr.full_text.toLowerCase().includes(query)
      )
    }

    if (abbreviationScopeFilter === 'global') {
      filtered = filtered.filter(abbr => abbr.is_global)
    } else if (abbreviationScopeFilter === 'organization') {
      filtered = filtered.filter(abbr => !abbr.is_global)
    }

    return filtered
  }, [allAbbreviations, abbreviationSearchQuery, abbreviationScopeFilter])

  // Toggle definition selection
  const toggleDefinition = (definitionId: string) => {
    setSelectedDefinitionIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(definitionId)) {
        newSet.delete(definitionId)
      } else {
        newSet.add(definitionId)
      }
      return newSet
    })
  }

  // Toggle abbreviation selection
  const toggleAbbreviation = (abbreviationId: string) => {
    setSelectedAbbreviationIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(abbreviationId)) {
        newSet.delete(abbreviationId)
      } else {
        newSet.add(abbreviationId)
      }
      return newSet
    })
  }

  // Select/deselect all visible definitions
  const toggleAllDefinitions = () => {
    const visibleIds = filteredDefinitions.map(d => d.id)
    const allSelected = visibleIds.every(id => selectedDefinitionIds.has(id))

    if (allSelected) {
      // Deselect all visible
      setSelectedDefinitionIds(prev => {
        const newSet = new Set(prev)
        visibleIds.forEach(id => newSet.delete(id))
        return newSet
      })
    } else {
      // Select all visible
      setSelectedDefinitionIds(prev => {
        const newSet = new Set(prev)
        visibleIds.forEach(id => newSet.add(id))
        return newSet
      })
    }
  }

  // Select/deselect all visible abbreviations
  const toggleAllAbbreviations = () => {
    const visibleIds = filteredAbbreviations.map(a => a.id)
    const allSelected = visibleIds.every(id => selectedAbbreviationIds.has(id))

    if (allSelected) {
      // Deselect all visible
      setSelectedAbbreviationIds(prev => {
        const newSet = new Set(prev)
        visibleIds.forEach(id => newSet.delete(id))
        return newSet
      })
    } else {
      // Select all visible
      setSelectedAbbreviationIds(prev => {
        const newSet = new Set(prev)
        visibleIds.forEach(id => newSet.add(id))
        return newSet
      })
    }
  }

  // Save selections
  const saveSelections = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Delete existing selections
      await supabase.from('manual_definitions').delete().eq('manual_id', manualId)
      await supabase.from('manual_abbreviations').delete().eq('manual_id', manualId)

      // Insert new definition selections
      if (selectedDefinitionIds.size > 0) {
        const definitionInserts = Array.from(selectedDefinitionIds).map((defId, index) => ({
          manual_id: manualId,
          definition_id: defId,
          display_order: index,
          created_by: user.id
        }))

        const { error: defInsertError } = await supabase
          .from('manual_definitions')
          .insert(definitionInserts)

        if (defInsertError) throw defInsertError
      }

      // Insert new abbreviation selections
      if (selectedAbbreviationIds.size > 0) {
        const abbreviationInserts = Array.from(selectedAbbreviationIds).map((abbrId, index) => ({
          manual_id: manualId,
          abbreviation_id: abbrId,
          display_order: index,
          created_by: user.id
        }))

        const { error: abbrInsertError } = await supabase
          .from('manual_abbreviations')
          .insert(abbreviationInserts)

        if (abbrInsertError) throw abbrInsertError
      }

      setSuccessMessage('References updated successfully')
      setTimeout(() => setSuccessMessage(null), 3000)

      if (onUpdate) {
        onUpdate()
      }
    } catch (err) {
      console.error('Error saving selections:', err)
      setError('Failed to save selections')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-docgen-blue" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with save button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Manual References</h3>
          <p className="text-sm text-gray-500">
            Select definitions and abbreviations to include in this manual
          </p>
        </div>
        <button
          onClick={saveSelections}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-docgen-blue rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Selections
            </>
          )}
        </button>
      </div>

      {/* Success/Error messages */}
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('definitions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'definitions'
                ? 'border-docgen-blue text-docgen-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Definitions ({selectedDefinitionIds.size})
          </button>
          <button
            onClick={() => setActiveTab('abbreviations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'abbreviations'
                ? 'border-docgen-blue text-docgen-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 mr-2" />
            Abbreviations ({selectedAbbreviationIds.size})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'definitions' ? (
        <div className="space-y-4">
          {/* Search and filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search definitions..."
                value={definitionSearchQuery}
                onChange={(e) => setDefinitionSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
              />
            </div>
            <select
              value={definitionScopeFilter}
              onChange={(e) => setDefinitionScopeFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
            >
              <option value="all">All Scopes</option>
              <option value="global">Global Only</option>
              <option value="organization">Organization Only</option>
            </select>
            <button
              onClick={toggleAllDefinitions}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {filteredDefinitions.every(d => selectedDefinitionIds.has(d.id))
                ? 'Deselect All'
                : 'Select All'}
            </button>
          </div>

          {/* Definition list */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {filteredDefinitions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No definitions found
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredDefinitions.map((definition) => (
                    <label
                      key={definition.id}
                      className="flex items-start p-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDefinitionIds.has(definition.id)}
                        onChange={() => toggleDefinition(definition.id)}
                        className="mt-1 h-4 w-4 text-docgen-blue border-gray-300 rounded focus:ring-docgen-blue"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">
                            {definition.term}
                          </span>
                          {definition.is_global ? (
                            <Globe className="h-3 w-3 ml-2 text-blue-500" />
                          ) : (
                            <Building className="h-3 w-3 ml-2 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {definition.definition}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search and filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search abbreviations..."
                value={abbreviationSearchQuery}
                onChange={(e) => setAbbreviationSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
              />
            </div>
            <select
              value={abbreviationScopeFilter}
              onChange={(e) => setAbbreviationScopeFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-docgen-blue focus:border-transparent"
            >
              <option value="all">All Scopes</option>
              <option value="global">Global Only</option>
              <option value="organization">Organization Only</option>
            </select>
            <button
              onClick={toggleAllAbbreviations}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {filteredAbbreviations.every(a => selectedAbbreviationIds.has(a.id))
                ? 'Deselect All'
                : 'Select All'}
            </button>
          </div>

          {/* Abbreviation list */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {filteredAbbreviations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No abbreviations found
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredAbbreviations.map((abbreviation) => (
                    <label
                      key={abbreviation.id}
                      className="flex items-start p-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAbbreviationIds.has(abbreviation.id)}
                        onChange={() => toggleAbbreviation(abbreviation.id)}
                        className="mt-1 h-4 w-4 text-docgen-blue border-gray-300 rounded focus:ring-docgen-blue"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">
                            {abbreviation.abbreviation}
                          </span>
                          {abbreviation.is_global ? (
                            <Globe className="h-3 w-3 ml-2 text-blue-500" />
                          ) : (
                            <Building className="h-3 w-3 ml-2 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {abbreviation.full_text}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}