'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import AuthRedirect from '@/components/AuthRedirect'
import UserTable from '@/app/component/users/UserTable'
import Pagination from '@/app/component/users/Pagination'
import SearchFilters from '@/app/component/users/SearchFilters'
import { User, conditionOptions, provinceOptions, formatToThaiTime } from '@/app/types/user'

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Logout error:', error)
  } else {
    window.location.href = '/pages/login'
  }
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

  const handleConditionChange = (id: string, value: string) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, condition: value || 'Not specified' } : user))
    )
  }

  const handleProvinceChange = (id: string, value: string) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, province: value || null as any } : user))
    )
  }

  const handleOtherChange = (id: string, value: string) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, other: value } : user))
    )
  }

  const handleSave = async (
    id: string,
    condition: string | null,
    province: string | undefined,
    other?: string
  ) => {
    console.log("Saving:", { id, condition, province, other });

    const { error: conditionError } = await supabase
      .from('user_record_summary')
      .update({ condition, other })
      .eq('user_id', id)

    const { data, error: provinceError } = await supabase
      .from('users')
      .update({ province: province || null })
      .eq('id', id)
      .select()

    console.log("Update result:", data, provinceError)

    if (conditionError || provinceError) {
      console.error('❌ Failed to update:', { conditionError, provinceError })
      alert('Failed to update')
    } else {
      alert('✅ Updated successfully')
      fetchUsers()
    }
    setEditingId(null)
  }

  if (!session) {
    return <AuthRedirect />
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

      <SearchFilters
        searchId={searchId}
        setSearchId={setSearchId}
        setCurrentPage={setCurrentPage}
        searchCondition={searchCondition}
        setSearchCondition={setSearchCondition}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        fetchUsers={fetchUsers}
        totalCount={totalCount}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
      />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <UserTable
            users={users}
            editingId={editingId}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            handleConditionChange={handleConditionChange}
            handleProvinceChange={handleProvinceChange}
            handleOtherChange={handleOtherChange}
            handleSave={handleSave}
            setEditingId={setEditingId}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemsPerPage={itemsPerPage}
            setCurrentPage={setCurrentPage}
          />
        </>
      )}
    </div>
  )
}