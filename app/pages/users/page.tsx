'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import AuthRedirect from '@/components/AuthRedirect'
import UserTable from '@/app/component/users/UserTable'
import Pagination from '@/app/component/users/Pagination'
import SearchFilters from '@/app/component/users/SearchFilters'
import PatientHistoryModal from '@/app/component/users/PatientHistoryModal'
import { User } from '@/app/types/user'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

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
  const [searchRisk, setSearchRisk] = useState('')
  const [searchOther, setSearchOther] = useState('')
  const [otherOptions, setOtherOptions] = useState<string[]>([])
  const [searchArea, setSearchArea] = useState('')
  const [areaOptions, setAreaOptions] = useState<string[]>([])
  const [searchSource, setSearchSource] = useState('')
  const [searchProvince, setSearchProvince] = useState('')
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  const [screeningThaiIds, setScreeningThaiIds] = useState<string[]>([])
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

    if (searchRisk.trim()) {
      if (searchRisk === 'null') {
        query = query.is('prediction_risk', null)
      } else {
        query = query.eq('prediction_risk', searchRisk === 'true')
      }
    }

    if (searchOther.trim()) {
      query = query.eq('other', searchOther)
    }

    if (searchArea.trim()) {
      query = query.eq('area', searchArea)
    }

    if (searchSource.trim()) {
      query = query.eq('source', searchSource)
    }

    if (searchProvince.trim()) {
      query = query.eq('province', searchProvince)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('❌ Error loading users:', error)
    } else {
      setUsers(data || [])
      setTotalCount(count || 0)

      // Determine which users have screening data (pd_screenings) by thaiid
      const thaiids = (data ?? []).map((u) => u.thaiid).filter((id): id is string => Boolean(id))
      if (thaiids.length > 0) {
        const { data: screeningData, error: screeningError } = await supabase
          .from('pd_screenings')
          .select('thaiid')
          .in('thaiid', thaiids)

        if (screeningError) {
          console.error('❌ Error loading screening thaiids:', screeningError)
        } else {
          const uniqueThaiids = Array.from(new Set(screeningData?.map((row) => row.thaiid).filter(Boolean)))
          setScreeningThaiIds(uniqueThaiids)
        }
      } else {
        setScreeningThaiIds([])
      }
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
  }, [currentPage, searchId, startDate, endDate, searchCondition, searchRisk, searchOther, searchArea, searchSource, searchProvince, session])

  useEffect(() => {
    if (!session) return

    const loadOtherOptions = async () => {
      const { data, error } = await supabase
        .from('user_record_summary_with_users')
        .select('other')
        .order('other', { ascending: true })

      if (error) {
        console.error('❌ Error loading other options:', error)
        return
      }

      const options = Array.from(
        new Set(
          (data ?? [])
            .map(({ other }) => (typeof other === 'string' ? other.trim() : ''))
            .filter((value) => value.length > 0)
        )
      )

      setOtherOptions(options)
    }

    const loadAreaOptions = async () => {
      const { data, error } = await supabase
        .from('user_record_summary_with_users')
        .select('area')
        .order('area', { ascending: true })

      if (error) {
        console.error('❌ Error loading area options:', error)
        return
      }

      const options = Array.from(
        new Set(
          (data ?? [])
            .map(({ area }) => (typeof area === 'string' ? area.trim() : ''))
            .filter((value) => value.length > 0)
        )
      )

      setAreaOptions(options)
    }

    loadOtherOptions()
    loadAreaOptions()
  }, [session])



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

  const handleAreaChange = (id: string, value: string) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, area: value } : user))
    )
  }

  const handleSave = async (
    id: string,
    condition: string | null,
    province: string | undefined,
    other?: string,
    area?: string
  ) => {
    console.log("Saving:", { id, condition, province, other, area });

    const { error: conditionError } = await supabase
      .from('user_record_summary')
      .update({ condition, other })
      .eq('user_id', id)

    const { data, error: provinceError } = await supabase
      .from('users')
      .update({ province: province || null, area: area || null })
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
        <h1 className="text-3xl font-semibold mb-4 text-gray-900">
          Patient Data Management System
        </h1>
        <Button variant="destructive" size="lg" className="gap-2" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </Button>
      </div>

      <SearchFilters
        searchId={searchId}
        setSearchId={setSearchId}
        setCurrentPage={setCurrentPage}
        searchCondition={searchCondition}
        setSearchCondition={setSearchCondition}
        searchRisk={searchRisk}
        setSearchRisk={setSearchRisk}
        searchOther={searchOther}
        setSearchOther={setSearchOther}
        otherOptions={otherOptions}
        searchArea={searchArea}
        setSearchArea={setSearchArea}
        areaOptions={areaOptions}
        searchSource={searchSource}
        setSearchSource={setSearchSource}
        searchProvince={searchProvince}
        setSearchProvince={setSearchProvince}
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
            handleAreaChange={handleAreaChange}
            handleSave={handleSave}
            setEditingId={setEditingId}
            onViewDetail={setViewingUser}
            hasScreeningThaiId={(thaiid) => screeningThaiIds.includes(thaiid)}
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

      {viewingUser && (
        <PatientHistoryModal
          thaiid={viewingUser.thaiid}
          userData={{
            id: viewingUser.id,
            firstname: viewingUser.firstname,
            lastname: viewingUser.lastname,
            age: viewingUser.age,
            gender: viewingUser.gender,
            province: viewingUser.province,
            prediction_risk: viewingUser.prediction_risk,
            condition: viewingUser.condition,
            other: viewingUser.other,
          }}
          onClose={() => setViewingUser(null)}
        />
      )}
    </div>
  )
}