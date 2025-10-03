'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Save, X, ChevronUp, ChevronDown, Check, AlertCircle } from 'lucide-react'

interface ReferenceCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
  display_order: number
  created_at: string
}

export default function ReferenceCategoriesSettings() {
  const supabase = createClient()
  const [categories, setCategories] = useState<ReferenceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<ReferenceCategory>>({})
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    is_active: true,
  })
  const [showNewForm, setShowNewForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from('reference_categories')
        .select('*')
        .order('display_order')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
      setMessage({
        type: 'error',
        text: 'Failed to load reference categories',
      })
    } finally {
      setLoading(false)
    }
  }

  async function createCategory() {
    try {
      const maxOrder = Math.max(...categories.map(c => c.display_order), 0)

      const { data, error } = await supabase
        .from('reference_categories')
        .insert({
          name: newCategory.name,
          description: newCategory.description || null,
          is_active: newCategory.is_active,
          display_order: maxOrder + 1,
        })
        .select()
        .single()

      if (error) throw error

      setCategories([...categories, data])
      setNewCategory({ name: '', description: '', is_active: true })
      setShowNewForm(false)
      setMessage({
        type: 'success',
        text: 'Category created successfully',
      })
    } catch (error: any) {
      console.error('Error creating category:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Failed to create category',
      })
    }
  }

  async function updateCategory(id: string) {
    try {
      const { error } = await supabase
        .from('reference_categories')
        .update({
          name: editForm.name,
          description: editForm.description,
          is_active: editForm.is_active,
        })
        .eq('id', id)

      if (error) throw error

      setCategories(categories.map(cat =>
        cat.id === id ? { ...cat, ...editForm } : cat
      ))
      setEditingId(null)
      setEditForm({})
      setMessage({
        type: 'success',
        text: 'Category updated successfully',
      })
    } catch (error: any) {
      console.error('Error updating category:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update category',
      })
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const { error } = await supabase
        .from('reference_categories')
        .delete()
        .eq('id', id)

      if (error) throw error

      setCategories(categories.filter(cat => cat.id !== id))
      setMessage({
        type: 'success',
        text: 'Category deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting category:', error)
      setMessage({
        type: 'error',
        text: 'Failed to delete category',
      })
    }
  }

  async function moveCategory(id: string, direction: 'up' | 'down') {
    const index = categories.findIndex(cat => cat.id === id)
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === categories.length - 1)
    ) {
      return
    }

    const newCategories = [...categories]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    // Swap display orders
    const tempOrder = newCategories[index].display_order
    newCategories[index].display_order = newCategories[targetIndex].display_order
    newCategories[targetIndex].display_order = tempOrder

    // Swap positions in array
    ;[newCategories[index], newCategories[targetIndex]] =
     [newCategories[targetIndex], newCategories[index]]

    setCategories(newCategories)

    // Update in database
    try {
      await Promise.all([
        supabase
          .from('reference_categories')
          .update({ display_order: newCategories[index].display_order })
          .eq('id', newCategories[index].id),
        supabase
          .from('reference_categories')
          .update({ display_order: newCategories[targetIndex].display_order })
          .eq('id', newCategories[targetIndex].id),
      ])
    } catch (error) {
      console.error('Error reordering categories:', error)
      loadCategories() // Reload to get correct order
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading reference categories...</div>
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Manage categories for organizing definitions and abbreviations
        </p>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* New Category Form */}
      {showNewForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">New Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Category name"
            />
            <input
              type="text"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Description (optional)"
            />
          </div>
          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newCategory.is_active}
                onChange={(e) => setNewCategory({ ...newCategory, is_active: e.target.checked })}
                className="text-blue-600"
              />
              <span className="text-sm">Active</span>
            </label>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => {
                  setShowNewForm(false)
                  setNewCategory({ name: '', description: '', is_active: true })
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createCategory}
                disabled={!newCategory.name}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-2">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className={`border rounded-lg p-4 ${
              category.is_active
                ? 'border-gray-200 bg-white'
                : 'border-gray-100 bg-gray-50'
            }`}
          >
            {editingId === category.id ? (
              // Edit Mode
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Category name"
                  />
                  <input
                    type="text"
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditForm({})
                      }}
                      className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => updateCategory(category.id)}
                      className="p-2 text-green-600 hover:text-green-800 transition-colors"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">
                      {category.name}
                    </span>
                    {!category.is_active && (
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {category.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Reorder Buttons */}
                  <button
                    onClick={() => moveCategory(category.id, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveCategory(category.id, 'down')}
                    disabled={index === categories.length - 1}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* Action Buttons */}
                  <button
                    onClick={() => {
                      setEditingId(category.id)
                      setEditForm({
                        name: category.name,
                        description: category.description,
                        is_active: category.is_active,
                      })
                    }}
                    className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="p-1.5 text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No reference categories found. Create your first category to get started.
          </div>
        )}
      </div>
    </div>
  )
}