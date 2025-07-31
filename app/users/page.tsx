'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import AuthRedirect from '@/components/AuthRedirect'

export type User = {
  id: string
  thaiid: string
  firstname: string
  lastname: string
  age: number
  prediction_risk: boolean | null
  recorder: string
  condition: string
  province?: string
  region?: string
  gender?: string
  source?: string
  timestamp?: string
  last_update?: string
}

const conditionOptions = [
  { value: '', label: 'All Conditions' },
  { value: 'cdt7', label: 'CDT7' },
  { value: 'ctrl', label: 'Control' },
  { value: 'pd', label: 'PD' },
  { value: 'pdm', label: 'PDM' },
  { value: 'pksm', label: 'PKSM' },
  { value: 'other', label: 'Other' },
  { value: 'nodiag', label: 'No Diagnosis' },
  { value: 'normal_check', label: 'Normal Check' },
  { value: 'Not specified', label: 'Not specified' },
  { value: 'not_eval', label: 'Not Evaluated' }
]

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Logout error:', error)
  } else {
    window.location.href = '/login' // Full page reload to clear state
  }
}

const formatToThaiTime = (timestamp: string | undefined) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  date.setHours(date.getHours() + 7)
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function UsersClientPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchId, setSearchId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchCondition, setSearchCondition] = useState('')
  const itemsPerPage = 50

  const fetchUsers = async () => {
    setLoading(true)
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1
    const likePattern = `%${searchId.trim()}%`
    let query = supabase
      .from('user_record_summary_with_users')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(from, to)
    if (searchId.trim()) {
      query = query.or(
        `id.ilike.${likePattern},firstname.ilike.${likePattern},lastname.ilike.${likePattern},recorder.ilike.${likePattern},thaiid.ilike.${likePattern}`
      )
    }

    if (startDate) query = query.gte('timestamp', startDate)
    if (endDate) {
      const nextDay = new Date(endDate)
      nextDay.setDate(nextDay.getDate() + 1)
      query = query.lt('timestamp', nextDay.toISOString())
    }

    if (searchCondition.trim()) {
      query = query.eq('condition', searchCondition)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('❌ Error loading users:', error)
    } else {
      setUsers(data || [])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      fetchUsers()
    }
  }, [currentPage, searchId, startDate, endDate, searchCondition, session])

  if (!session) {
    return <AuthRedirect />
  }

  const handleConditionChange = (id: string, value: string) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, condition: value || 'Not specified' } : user))
    )
  }

  const handleSave = async (id: string, condition: string | null) => {
    const { error } = await supabase
      .from('user_record_summary')
      .update({ condition })
      .eq('user_id', id)

    if (error) {
      console.error('❌ Failed to update:', error)
      alert('Failed to update')
    } else {
      alert('✅ Updated successfully')
      fetchUsers() // Refresh data after update
    }
    setEditingId(null)
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <div className="max-w-9xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold mb-4 text-gray-900">Patient Data Management System</h1>
        <button
          onClick={handleLogout}
          className="px-5 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition duration-300"
        >
          Sign Out
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Patient</label>
            <input
              type="text"
              placeholder="ID, Name, or Thai ID"
              value={searchId}
              onChange={(e) => {
                setSearchId(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
            <select
              value={searchCondition}
              onChange={(e) => {
                setSearchCondition(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {conditionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} records
          </p>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Data Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Patient ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Age/Gender</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Recorded</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Risk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Condition</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user, index) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.id}</div>
                      <div className="text-sm text-gray-500">{user.thaiid}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstname} {user.lastname}
                      </div>
                      <div className="text-sm text-gray-500">{user.recorder}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.source || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.age} years</div>
                      <div className="text-sm text-gray-500">{user.gender || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.province || '-'}</div>
                      <div className="text-sm text-gray-500">{user.region || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatToThaiTime(user.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.prediction_risk === true && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          High Risk
                        </span>
                      )}
                      {user.prediction_risk === false && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Low Risk
                        </span>
                      )}
                      {user.prediction_risk === null && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          No Data
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === user.id ? (
                        <select
                          value={user.condition || ''}
                          onChange={(e) => handleConditionChange(user.id, e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          {conditionOptions.filter(opt => opt.value).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          !user.condition || user.condition === 'Not specified' ? 'bg-gray-100 text-gray-800' :
                          user.condition === 'pd' || user.condition === 'pdm' ? 'bg-purple-100 text-purple-800' :
                          user.condition === 'cdt7' ? 'bg-blue-100 text-blue-800' :
                          user.condition === 'ctrl' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.condition || 'Not specified'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingId === user.id ? (
                        <div className="space-x-2">
                          <button
                            onClick={() => handleSave(user.id, user.condition)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingId(user.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6 rounded-b-lg">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                  <span className="font-medium">{totalCount}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">First</span>
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    ‹
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Last</span>
                    »
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}