'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import QaSearchFilters from '@/app/component/qa/QaSearchFilters'
import QaTable from '@/app/component/qa/QaTable'
import QaCreateModal from '@/app/component/qa/QaCreateModal'
import QaAssessmentModal from '@/app/component/qa/QaAssessmentModal'
import QaPatientSummaryModal from '@/app/component/qa/QaPatientSummaryModal'
import TablePagination from '@/app/component/users/Pagination'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import SidebarLayout from '@/app/component/layout/SidebarLayout'
import { logActivity } from '@/lib/activityLog'
import { useAccessProfile } from '@/app/hooks/useAccessProfile'
import {
  PAGE_SIZE,
  QaConditionFilter,
  QaPatient,
  QaDiagnosisRow,
  QaScoreRow,
  QaHamdRow,
  QaRow,
  formatQaConditionLabel,
  hasQaGp2,
  matchesQaConditionFilter,
} from '@/app/component/qa/types'

const DIAG_SELECT =
  'patient_id,condition,hy_stage,disease_duration,other_diagnosis_text,constipation,constipation_onset_age,constipation_duration,rbd_suspected,rbd_onset_age,rbd_duration,hyposmia,hyposmia_onset_age,hyposmia_duration,depression,depression_onset_age,depression_duration,eds,eds_onset_age,eds_duration,ans_dysfunction,ans_onset_age,ans_duration,mild_parkinsonian_sign,family_history_pd,adl_score,scopa_aut_score,blood_test_note,fdopa_pet_requested,fdopa_pet_score'

export default function QaPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const { accessProfile } = useAccessProfile(session)
  const role = accessProfile.role

  // Filter state
  const [search, setSearch] = useState('')
  const [thaiId, setThaiId] = useState('')
  const [condition, setCondition] = useState<QaConditionFilter>('')
  const [gp2, setGp2] = useState('')
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

  // Create / Edit modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [editPatient, setEditPatient] = useState<QaPatient | null>(null)
  const [editDiag, setEditDiag] = useState<QaDiagnosisRow | null>(null)

  // Assessment modal state
  const [assessingPatient, setAssessingPatient] = useState<QaPatient | null>(null)

  // Patient summary modal state
  const [summaryRow, setSummaryRow] = useState<QaRow | null>(null)

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const fetchData = useCallback(async () => {
    if (!session) return

    setLoading(true)
    setError(null)

    try {
      // --- Step 1: resolve patient IDs from diagnosis filters (condition / H&Y) ---
      let diagFilteredIds: number[] | null = null

      if (condition || hyStage || gp2) {
        let diagQuery = supabase
          .schema('core')
          .from('patient_diagnosis_v2')
          .select(DIAG_SELECT)

        if (hyStage) diagQuery = diagQuery.eq('hy_stage', hyStage)

        const { data: diagData, error: diagErr } = await diagQuery
        if (diagErr) throw new Error(`patient_diagnosis_v2: ${diagErr.message}`)
        const diagRows = (diagData ?? []) as QaDiagnosisRow[]
        const filteredRows = diagRows.filter((d) => {
          if (condition && !matchesQaConditionFilter(d, condition)) return false
          if (gp2 && !hasQaGp2(d)) return false
          return true
        })
        diagFilteredIds = filteredRows.map((d) => d.patient_id)
      }

      // --- Step 2: query patients_v2 with all patient-level filters ---
      let patientQuery = supabase
        .schema('core')
        .from('patients_v2')
        .select(
          'id,first_name,last_name,age,province,collection_date,hn_number,thaiid,bmi,weight,height,chest_cm,waist_cm,hip_cm,neck_cm,bp_supine,pr_supine,bp_upright,pr_upright',
          { count: 'exact' }
        )
        .order('collection_date', { ascending: false, nullsFirst: false })
        .range(from, to)

      if (search.trim()) {
        const q = `%${search.trim()}%`
        patientQuery = patientQuery.or(`first_name.ilike.${q},last_name.ilike.${q},hn_number.ilike.${q}`)
      }
      if (thaiId.trim()) patientQuery = patientQuery.ilike('thaiid', `%${thaiId.trim()}%`)
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
      const [diagRes, mocaRes, hamdRes, mdsRes, epwRes, smellRes, tmseRes, rbdRes, rome4Res] =
        await Promise.all([
          supabase.schema('core').from('patient_diagnosis_v2').select(DIAG_SELECT).in('patient_id', patientIds),
          supabase.schema('core').from('moca_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('hamd_v2').select('patient_id,total_score,severity_level').in('patient_id', patientIds),
          supabase.schema('core').from('mds_updrs_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('epworth_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('smell_test_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('tmse_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('rbd_questionnaire_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('rome4_v2').select('patient_id,total_score').in('patient_id', patientIds),
        ])

      const errors = [diagRes, mocaRes, hamdRes, mdsRes, epwRes, smellRes, tmseRes, rbdRes, rome4Res]
        .map((r, i) => r.error ? `table[${i}]: ${r.error.message}` : null)
        .filter(Boolean)
      if (errors.length > 0) throw new Error(errors.join(', '))

      const diagMap   = Object.fromEntries((diagRes.data   ?? []).map((d: QaDiagnosisRow) => [d.patient_id, d]))
      const mocaMap   = Object.fromEntries((mocaRes.data   ?? []).map((d: QaScoreRow)    => [d.patient_id, d]))
      const hamdMap   = Object.fromEntries((hamdRes.data   ?? []).map((d: QaHamdRow)     => [d.patient_id, d]))
      const mdsMap    = Object.fromEntries((mdsRes.data    ?? []).map((d: QaScoreRow)    => [d.patient_id, d]))
      const epwMap    = Object.fromEntries((epwRes.data    ?? []).map((d: QaScoreRow)    => [d.patient_id, d]))
      const smellMap  = Object.fromEntries((smellRes.data  ?? []).map((d: QaScoreRow)    => [d.patient_id, d]))
      const tmseMap   = Object.fromEntries((tmseRes.data   ?? []).map((d: QaScoreRow)    => [d.patient_id, d]))
      const rbdMap    = Object.fromEntries((rbdRes.data    ?? []).map((d: QaScoreRow)    => [d.patient_id, d]))
      const rome4Map  = Object.fromEntries((rome4Res.data  ?? []).map((d: QaScoreRow)    => [d.patient_id, d]))

      setRows(patients.map((p) => ({
        patient: p,
        diag:  diagMap[p.id] as QaDiagnosisRow | undefined,
        conditionLabel: formatQaConditionLabel(diagMap[p.id] as QaDiagnosisRow | undefined),
        moca:  mocaMap[p.id] as QaScoreRow | undefined,
        hamd:  hamdMap[p.id] as QaHamdRow | undefined,
        mds:   mdsMap[p.id] as QaScoreRow | undefined,
        epw:   epwMap[p.id] as QaScoreRow | undefined,
        smell: smellMap[p.id] as QaScoreRow | undefined,
        tmse:  tmseMap[p.id] as QaScoreRow | undefined,
        rbd:   rbdMap[p.id] as QaScoreRow | undefined,
        rome4: rome4Map[p.id] as QaScoreRow | undefined,
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [session, search, thaiId, condition, gp2, hyStage, province, startDate, endDate, currentPage])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSessionReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleEdit = (patient: QaPatient) => {
    const row = rows.find((r) => r.patient.id === patient.id)
    setEditPatient(patient)
    setEditDiag(row?.diag ?? null)
    setCreateOpen(true)
  }

  const handleDelete = async (patientId: number, name: string) => {
    if (!confirm(`ลบผู้ป่วย "${name}" และข้อมูลแบบทดสอบทั้งหมด?`)) return
    const { error: delErr } = await supabase
      .schema('core')
      .from('patients_v2')
      .delete()
      .eq('id', patientId)
    if (delErr) {
      setError(`Delete failed: ${delErr.message}`)
      return
    }
    logActivity({ action: 'DELETE', page: 'qa', description: `ลบผู้ป่วย: ${name}`, userEmail: session?.user?.email })
    setRows((prev) => prev.filter((r) => r.patient.id !== patientId))
    setTotalCount((prev) => prev - 1)
  }

  const handleModalClose = () => {
    setCreateOpen(false)
    setEditPatient(null)
    setEditDiag(null)
  }

  useEffect(() => {
    if (!sessionReady || !session) return
    fetchData()
  }, [fetchData, sessionReady, session])

  return (
    <SidebarLayout activePath="/pages/qa" mainClassName="bg-gray-50">
    <div className="mx-auto max-w-9xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">QA — Parkinson System</h1>
        <Button
          onClick={() => { setEditPatient(null); setEditDiag(null); setCreateOpen(true) }}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" />
          เพิ่มผู้ป่วยใหม่
        </Button>
      </div>

      <QaPatientSummaryModal
        row={summaryRow}
        onClose={() => setSummaryRow(null)}
      />

      <QaCreateModal
        open={createOpen}
        onClose={handleModalClose}
        role={role}
        onCreated={() => {
          logActivity({
            action: editPatient ? 'UPDATE' : 'CREATE',
            page: 'qa',
            description: editPatient
              ? `แก้ไขข้อมูลผู้ป่วย: ${editPatient.first_name} ${editPatient.last_name}`
              : 'เพิ่มผู้ป่วยใหม่',
            userEmail: session?.user?.email,
          })
          fetchData()
        }}
        editPatient={editPatient}
        editDiag={editDiag}
      />

      <QaAssessmentModal
        open={assessingPatient !== null}
        patient={assessingPatient}
        onClose={() => setAssessingPatient(null)}
        onUpdated={() => {
          if (assessingPatient) {
            logActivity({
              action: 'UPDATE',
              page: 'qa',
              description: `อัปเดตผลประเมิน: ${assessingPatient.first_name} ${assessingPatient.last_name}`,
              userEmail: session?.user?.email,
            })
          }
          fetchData()
        }}
      />

      <QaSearchFilters
        search={search}
        setSearch={setSearch}
        thaiId={thaiId}
        setThaiId={setThaiId}
        condition={condition}
        setCondition={setCondition}
        gp2={gp2}
        setGp2={setGp2}
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

      {!sessionReady || loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          <QaTable
            rows={rows}
            role={role}
            onAssess={setAssessingPatient}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDetail={setSummaryRow}
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
        Tables: patients_v2, patient_diagnosis_v2, moca_v2, hamd_v2, mds_updrs_v2, epworth_v2, smell_test_v2, tmse_v2, rbd_questionnaire_v2, rome4_v2
      </p>
    </div>
    </SidebarLayout>
  )
}
