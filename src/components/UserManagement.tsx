'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Shield, UserX, UserCheck, Plus, AlertCircle } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: 'sysadmin' | 'manager'
  is_active: boolean
  created_at: string
  last_sign_in_at?: string
}

interface UserManagementProps {
  initialUsers: UserProfile[]
}

export default function UserManagement({ initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'manager' | 'sysadmin'>('manager')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createClient()

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validate email domain
    const emailDomain = inviteEmail.split('@')[1]?.toLowerCase()
    if (emailDomain !== 'heliairsweden.com') {
      setError('Only @heliairsweden.com email addresses can be invited')
      return
    }

    setLoading(true)

    try {
      // Send invitation email using Resend (to be implemented)
      // For now, we'll create a placeholder user profile
      const { data, error: inviteError } = await supabase
        .from('user_profiles')
        .insert({
          email: inviteEmail,
          full_name: inviteName,
          role: inviteRole,
          is_active: false,
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      setUsers([data, ...users])
      setSuccess(`Invitation sent to ${inviteEmail}`)
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('manager')
    } catch (error: any) {
      setError(error.message || 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus

      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: newStatus })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(user =>
        user.id === userId ? { ...user, is_active: newStatus } : user
      ))

      setSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully`)
    } catch (error: any) {
      setError(error.message || 'Failed to update user status')
    }
  }

  const updateUserRole = async (userId: string, newRole: 'manager' | 'sysadmin') => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ))

      setSuccess('User role updated successfully')
    } catch (error: any) {
      setError(error.message || 'Failed to update user role')
    }
  }

  return (
    <div className="mt-8">
      {/* Action buttons */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-docgen-blue hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-docgen-blue"
        >
          <Plus className="h-4 w-4 mr-2" />
          Invite User
        </button>
      </div>

      {/* Success/Error messages */}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <UserCheck className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">{success}</h3>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setSuccess(null)}
                className="inline-flex rounded-md bg-green-50 p-1.5 text-green-500 hover:bg-green-100"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Sign In
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <User className="h-10 w-10 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.role}
                    onChange={(e) => updateUserRole(user.id, e.target.value as 'manager' | 'sysadmin')}
                    className="text-sm rounded-md border-gray-300 focus:ring-docgen-blue focus:border-docgen-blue"
                  >
                    <option value="manager">Manager</option>
                    <option value="sysadmin">SysAdmin</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.is_active ? 'active' : 'inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => toggleUserStatus(user.id, user.is_active)}
                    className={`${
                      user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                    }`}
                  >
                    {user.is_active ? (
                      <UserX className="h-5 w-5" />
                    ) : (
                      <UserCheck className="h-5 w-5" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleInviteUser}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                      <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Invite New User
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="invite-email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="user@heliairsweden.com"
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="invite-name" className="block text-sm font-medium text-gray-700">
                            Full Name
                          </label>
                          <input
                            type="text"
                            id="invite-name"
                            value={inviteName}
                            onChange={(e) => setInviteName(e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
                            Role
                          </label>
                          <select
                            id="invite-role"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as 'manager' | 'sysadmin')}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-docgen-blue focus:border-docgen-blue sm:text-sm"
                          >
                            <option value="manager">Manager</option>
                            <option value="sysadmin">SysAdmin</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-docgen-blue text-base font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-docgen-blue sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Invitation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
