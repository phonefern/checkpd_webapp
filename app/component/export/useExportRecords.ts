'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getRecordKey, type ExportUser } from '@/lib/exportZip'

const EXPORT_LIST_VIEW = 'user_record_summary_with_users'
export const EXPORT_ITEMS_PER_PAGE = 50

export const conditionOptions = [
  { value: '', label: 'All Conditions' },
  { value: 'ctrl', label: 'ctrl' },
  { value: 'pd', label: 'pd' },
  { value: 'pdm', label: 'pdm' },
  { value: 'other', label: 'other' },
  { value: 'Not specified', label: 'Not specified' },
]

export function useExportRecords(sessionReady: boolean) {
  const [users, setUsers] = useState<ExportUser[]>([])
  const [allSelectedRecords, setAllSelectedRecords] = useState<ExportUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchId, setSearchId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchCondition, setSearchCondition] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [error, setError] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    const from = (currentPage - 1) * EXPORT_ITEMS_PER_PAGE
    const to = from + EXPORT_ITEMS_PER_PAGE - 1
    const likePattern = `%${searchId.trim()}%`
    let query = supabase
      .from(EXPORT_LIST_VIEW)
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(from, to)

    if (searchId.trim()) {
      query = query.or(
        `id.ilike.${likePattern},record_id.ilike.${likePattern},firstname.ilike.${likePattern},lastname.ilike.${likePattern},recorder.ilike.${likePattern},thaiid.ilike.${likePattern},condition.ilike.${likePattern}`
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
      console.error('Error loading users:', error)
      setError('Failed to load records')
    } else {
      setUsers((data || []) as ExportUser[])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (sessionReady) {
      fetchUsers()
    }
  }, [currentPage, searchId, startDate, endDate, searchCondition, sessionReady])

  useEffect(() => {
    const fetchAllRecords = async () => {
      try {
        let query = supabase
          .from(EXPORT_LIST_VIEW)
          .select('*')
          .order('timestamp', { ascending: false })

        if (searchId.trim()) {
          const likePattern = `%${searchId.trim()}%`
          query = query.or(
            `id.ilike.${likePattern},record_id.ilike.${likePattern},firstname.ilike.${likePattern},lastname.ilike.${likePattern},recorder.ilike.${likePattern},thaiid.ilike.${likePattern},condition.ilike.${likePattern}`
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

        const { data, error } = await query

        if (error) {
          console.error('Error fetching all records:', error)
          setError('Failed to fetch all records')
          setSelectAll(false)
        } else if (data) {
          const records = data as ExportUser[]
          setSelectedUsers(new Set(records.map((u) => getRecordKey(u))))
          setAllSelectedRecords(records)
        }
      } catch (error) {
        console.error('Error in select all:', error)
        setError('Failed to select all records')
        setSelectAll(false)
      }
    }

    if (selectAll) {
      fetchAllRecords()
    } else {
      setSelectedUsers(new Set())
      setAllSelectedRecords([])
    }
  }, [selectAll, searchId, startDate, endDate, searchCondition])

  const handleUserSelect = (user: ExportUser) => {
    const newSelected = new Set(selectedUsers)
    const recordKey = getRecordKey(user)
    if (newSelected.has(recordKey)) {
      newSelected.delete(recordKey)
    } else {
      newSelected.add(recordKey)
    }
    setSelectedUsers(newSelected)
  }

  const resetFilters = () => {
    setSearchId('')
    setStartDate('')
    setEndDate('')
    setSearchCondition('')
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalCount / EXPORT_ITEMS_PER_PAGE)
  const visibleStart = totalCount === 0 ? 0 : ((currentPage - 1) * EXPORT_ITEMS_PER_PAGE) + 1
  const visibleEnd = Math.min(currentPage * EXPORT_ITEMS_PER_PAGE, totalCount)

  return {
    users,
    allSelectedRecords,
    loading,
    searchId,
    setSearchId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    searchCondition,
    setSearchCondition,
    currentPage,
    setCurrentPage,
    totalCount,
    selectedUsers,
    setSelectedUsers,
    selectAll,
    setSelectAll,
    error,
    setError,
    fetchUsers,
    handleUserSelect,
    resetFilters,
    totalPages,
    visibleStart,
    visibleEnd,
  }
}
