'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import QaSearchFilters from '@/app/component/qa/QaSearchFilters'
import QaTable from '@/app/component/qa/QaTable'
import TablePagination from '@/app/component/users/Pagination'
import {
  PAGE_SIZE,
  QaPatient,
  QaDiagnosisRow,
  QaScoreRow,
  QaHamdRow,
  QaRow,
  detectQaCondition,
} from '@/app/component/qa/types'

export default function QaPage() {
  // Filter state
  const [search, setSearch] = useState('')
  const [condition, setCondition] = useState('')
  const [hyStage, setHyStage] = useState('')
  const [province, setProvince] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Data state
  const [rows, setRows] = useState<QaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // --- Step 1: resolve patient IDs from diagnosis filters (condition / H&Y) ---
      let diagFilteredIds: number[] | null = null

      if (condition || hyStage) {
        let diagQuery = supabase
          .schema('core')
          .from('patient_diagnosis_v2')
          .select('patient_id,condition,hy_stage,disease_duration,other_diagnosis_text,constipation,rbd_suspected')

        if (hyStage)   diagQuery = diagQuery.eq('hy_stage', hyStage)

        const { data: diagData, error: diagErr } = await diagQuery
        if (diagErr) throw new Error(`patient_diagnosis_v2: ${diagErr.message}`)
        const diagRows = (diagData ?? []) as QaDiagnosisRow[]
        const filteredRows = condition
          ? diagRows.filter((d) => detectQaCondition(d) === condition)
          : diagRows
        diagFilteredIds = filteredRows.map((d) => d.patient_id)
      }

      // --- Step 2: query patients_v2 with all patient-level filters ---
      let patientQuery = supabase
        .schema('core')
        .from('patients_v2')
        .select('id,first_name,last_name,age,province,collection_date,hn_number,bmi', { count: 'exact' })
        .order('id', { ascending: false })
        .range(from, to)

      if (search.trim()) {
        const q = `%${search.trim()}%`
        patientQuery = patientQuery.or(`first_name.ilike.${q},last_name.ilike.${q},hn_number.ilike.${q}`)
      }
      if (province)  patientQuery = patientQuery.eq('province', province)
      if (startDate) patientQuery = patientQuery.gte('collection_date', startDate)
      if (endDate)   patientQuery = patientQuery.lte('collection_date', endDate)
      if (diagFilteredIds !== null) {
        if (diagFilteredIds.length === 0) {
          setRows([])
          setTotalCount(0)
          setLoading(false)
          return
        }
        patientQuery = patientQuery.in('id', diagFilteredIds)
      }

      const { data: patientData, error: pErr, count } = await patientQuery
      if (pErr) throw new Error(`patients_v2: ${pErr.message}`)

      const patients = (patientData ?? []) as QaPatient[]
      setTotalCount(count ?? 0)

      if (patients.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const patientIds = patients.map((p) => p.id)

      // --- Step 3: fetch related data for this page's patients ---
      const [diagRes, mocaRes, hamdRes, mdsRes, epwRes, smellRes] = await Promise.all([
        supabase.schema('core').from('patient_diagnosis_v2')
          .select('patient_id,condition,hy_stage,disease_duration,other_diagnosis_text,constipation,rbd_suspected')
          .in('patient_id', patientIds),
        supabase.schema('core').from('moca_v2').select('patient_id,total_score').in('patient_id', patientIds),
        supabase.schema('core').from('hamd_v2').select('patient_id,total_score,severity_level').in('patient_id', patientIds),
        supabase.schema('core').from('mds_updrs_v2').select('patient_id,total_score').in('patient_id', patientIds),
        supabase.schema('core').from('epworth_v2').select('patient_id,total_score').in('patient_id', patientIds),
        supabase.schema('core').from('smell_test_v2').select('patient_id,total_score').in('patient_id', patientIds),
      ])

      const errors = [diagRes, mocaRes, hamdRes, mdsRes, epwRes, smellRes]
        .map((r, i) => r.error ? `table[${i}]: ${r.error.message}` : null)
        .filter(Boolean)
      if (errors.length > 0) throw new Error(errors.join(', '))

      const diagMap  = Object.fromEntries((diagRes.data  ?? []).map((d: QaDiagnosisRow) => [d.patient_id, d]))
      const mocaMap  = Object.fromEntries((mocaRes.data  ?? []).map((d: QaScoreRow)    => [d.patient_id, d]))
      const hamdMap  = Object.fromEntries((hamdRes.data  ?? []).map((d: QaHamdRow)     => [d.patient_id, d]))
      const mdsMap   = Object.fromEntries((mdsRes.data   ?? []).map((d: QaScoreRow)    => [d.patient_id, d]))
      const epwMap   = Object.fromEntries((epwRes.data   ?? []).map((d: QaScoreRow)    => [d.patient_id, d]))
      const smellMap = Object.fromEntries((smellRes.data ?? []).map((d: QaScoreRow)    => [d.patient_id, d]))

      setRows(patients.map((p) => ({
        patient: p,
        diag:  diagMap[p.id] as QaDiagnosisRow | undefined,
        conditionLabel: detectQaCondition(diagMap[p.id] as QaDiagnosisRow | undefined),
        moca:  mocaMap[p.id] as QaScoreRow | undefined,
        hamd:  hamdMap[p.id] as QaHamdRow | undefined,
        mds:   mdsMap[p.id] as QaScoreRow | undefined,
        epw:   epwMap[p.id] as QaScoreRow | undefined,
        smell: smellMap[p.id] as QaScoreRow | undefined,
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [search, condition, hyStage, province, startDate, endDate, currentPage])

  const handleFieldChange = (patientId: number, field: string, value: string) => {
    setRows((prev) => prev.map((row) => {
      if (row.patient.id !== patientId) return row
      if (field === 'province') {
        return { ...row, patient: { ...row.patient, province: value || null } }
      }
      const newDiag: QaDiagnosisRow = row.diag
        ? { ...row.diag, [field]: value || null }
        : { patient_id: patientId, condition: null, hy_stage: null, disease_duration: null, other_diagnosis_text: null, constipation: null, rbd_suspected: null, [field]: value || null }
      return { ...row, diag: newDiag, conditionLabel: detectQaCondition(newDiag) }
    }))
  }

  const handleSave = async (patientId: number) => {
    const row = rows.find((r) => r.patient.id === patientId)
    if (!row) return

    const [patRes, diagRes] = await Promise.all([
      supabase.schema('core').from('patients_v2')
        .update({ province: row.patient.province })
        .eq('id', patientId),
      supabase.schema('core').from('patient_diagnosis_v2')
        .upsert({
          patient_id: patientId,
          condition: row.diag?.condition ?? null,
          hy_stage: row.diag?.hy_stage ?? null,
          disease_duration: row.diag?.disease_duration ?? null,
          other_diagnosis_text: row.diag?.other_diagnosis_text ?? null,
          constipation: row.diag?.constipation ?? null,
          rbd_suspected: row.diag?.rbd_suspected ?? null,
        }, { onConflict: 'patient_id' }),
    ])

    if (patRes.error || diagRes.error) {
      setError(`Save failed: ${patRes.error?.message ?? diagRes.error?.message}`)
      return
    }
    setEditingId(null)
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="max-w-9xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h1 className="text-3xl font-semibold mb-4 text-gray-900">QA — Parkinson System</h1>

      <QaSearchFilters
        search={search}
        setSearch={setSearch}
        condition={condition}
        setCondition={setCondition}
        hyStage={hyStage}
        setHyStage={setHyStage}
        province={province}
        setProvince={setProvince}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        setCurrentPage={setCurrentPage}
        totalCount={totalCount}
        currentPage={currentPage}
        itemsPerPage={PAGE_SIZE}
        onRefresh={fetchData}
      />

      {error && (
        <div className="mb-4 rounded border bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          <QaTable
            rows={rows}
            editingId={editingId}
            setEditingId={setEditingId}
            onFieldChange={handleFieldChange}
            onSave={handleSave}
          />
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemsPerPage={PAGE_SIZE}
            setCurrentPage={setCurrentPage}
          />
        </>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Tables: patients_v2, patient_diagnosis_v2, moca_v2, hamd_v2, mds_updrs_v2, epworth_v2, smell_test_v2
      </p>
    </div>
  )
}
