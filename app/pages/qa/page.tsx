'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import QaSearchFilters from '@/app/component/qa/QaSearchFilters'
import QaTable, { type QaSortColumn, type QaSortDirection } from '@/app/component/qa/QaTable'
import QaCreateModal from '@/app/component/qa/QaCreateModal'
import QaAssessmentModal from '@/app/component/qa/QaAssessmentModal'
import QaPatientSummaryModal from '@/app/component/qa/QaPatientSummaryModal'
import TablePagination from '@/app/component/users/Pagination'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import SidebarLayout from '@/app/component/layout/SidebarLayout'
import { logActivity } from '@/lib/activityLog'
import { useAccessProfile } from '@/app/hooks/useAccessProfile'
import { useSession } from '@/app/providers/SessionProvider'
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
import {
  PATIENT_VISIT_SELECT,
  buildIdentityCacheKey,
  fetchIdentityMatchedVisits,
} from '@/app/component/qa/visitIdentity'

const DIAG_SELECT =
  'patient_id,condition,hy_stage,disease_duration,other_diagnosis_text,constipation,constipation_onset_age,constipation_duration,rbd_suspected,rbd_onset_age,rbd_duration,hyposmia,hyposmia_onset_age,hyposmia_duration,depression,depression_onset_age,depression_duration,eds,eds_onset_age,eds_duration,ans_dysfunction,ans_onset_age,ans_duration,mild_parkinsonian_sign,family_history_pd,adl_score,scopa_aut_score,blood_test_note,fdopa_pet_requested,fdopa_pet_score'

export default function QaPage() {
  const { session, loading: sessionLoading } = useSession()
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

  // Sort state (server-side, mirrors the Users page pattern)
  const [sortColumn, setSortColumn] = useState<QaSortColumn>('collection_date')
  const [sortDirection, setSortDirection] = useState<QaSortDirection>('desc')

  // Data state
  const [rows, setRows] = useState<QaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [focusHandled, setFocusHandled] = useState(false)

  // Create / Edit modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [editPatient, setEditPatient] = useState<QaPatient | null>(null)
  const [editDiag, setEditDiag] = useState<QaDiagnosisRow | null>(null)
  const [prefillPatient, setPrefillPatient] = useState<QaPatient | null>(null)

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
      // --- Step 1: resolve patient IDs from diagnosis filters (condition / H&Y / GP2) ---
      let diagFilteredIds: number[] | null = null

      if (condition || hyStage || gp2) {
        // condition/GP2 matching is fuzzy, so it must run in memory — but page past
        // Supabase's default 1000-row API cap, otherwise matches beyond the first
        // 1000 diagnosis rows are silently dropped and the filter looks broken.
        const DIAG_FILTER_SELECT = 'patient_id,condition,other_diagnosis_text,blood_test_note'
        const CHUNK = 1000
        const diagRows: QaDiagnosisRow[] = []

        for (let offset = 0; ; offset += CHUNK) {
          let diagQuery = supabase
            .schema('core')
            .from('patient_diagnosis_v2')
            .select(DIAG_FILTER_SELECT)
            .order('patient_id', { ascending: true })
            .range(offset, offset + CHUNK - 1)

          if (hyStage) diagQuery = diagQuery.eq('hy_stage', hyStage)

          const { data: diagData, error: diagErr } = await diagQuery
          if (diagErr) throw new Error(`patient_diagnosis_v2: ${diagErr.message}`)

          const batch = (diagData ?? []) as QaDiagnosisRow[]
          diagRows.push(...batch)
          if (batch.length < CHUNK) break
        }

        const filteredRows = diagRows.filter((d) => {
          if (condition && !matchesQaConditionFilter(d, condition)) return false
          if (gp2 && !hasQaGp2(d)) return false
          return true
        })
        diagFilteredIds = filteredRows.map((d) => d.patient_id)
      }

      // --- Step 2: query patient_visits_v2 with all patient-level filters ---
      const ascending = sortDirection === 'asc'
      let patientQuery = supabase
        .from('patient_visits_v2')
        .select(PATIENT_VISIT_SELECT, { count: 'exact' })
        .order(sortColumn, { ascending, nullsFirst: false })

      // When sorting by collection_date keep the original time-based tiebreakers so
      // same-day visits stay in submission order; otherwise just stabilise by id.
      if (sortColumn === 'collection_date') {
        patientQuery = patientQuery
          .order('submission_timestamp', { ascending, nullsFirst: false })
          .order('created_at', { ascending, nullsFirst: false })
      }
      if (sortColumn !== 'id') {
        patientQuery = patientQuery.order('id', { ascending: false })
      }
      patientQuery = patientQuery.range(from, to)

      if (search.trim()) {
        const raw = search.trim()
        const q = `%${raw}%`
        const orParts = [
          `first_name.ilike.${q}`,
          `last_name.ilike.${q}`,
          `hn_number.ilike.${q}`,
        ]

        if (/^\d+$/.test(raw)) orParts.push(`id.eq.${raw}`)
        if (/^[0-9a-f-]{32,36}$/i.test(raw)) orParts.push(`patient_uid.eq.${raw}`)

        patientQuery = patientQuery.or(orParts.join(','))
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
      if (pErr) throw new Error(`patient_visits_v2: ${pErr.message}`)

      const patients = (patientData ?? []) as QaPatient[]
      setTotalCount(count ?? 0)

      if (patients.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const identityVisitCache = new Map<string, QaPatient[]>()
      const derivedVisitMap = new Map<
        number,
        Pick<QaPatient, 'visit_no' | 'total_visits' | 'same_day_visit_seq' | 'same_day_visit_count'>
      >()

      await Promise.all(
        patients.map(async (patient) => {
          const cacheKey = buildIdentityCacheKey(patient)
          let matchedVisits = identityVisitCache.get(cacheKey)
          if (!matchedVisits) {
            try {
              matchedVisits = await fetchIdentityMatchedVisits(patient, PATIENT_VISIT_SELECT)
            } catch (identityErr) {
              console.warn('visit identity lookup failed:', identityErr)
              matchedVisits = [patient]
            }
            identityVisitCache.set(cacheKey, matchedVisits)
          }

          for (const visit of matchedVisits) {
            derivedVisitMap.set(visit.id, {
              visit_no: visit.visit_no,
              total_visits: visit.total_visits,
              same_day_visit_seq: visit.same_day_visit_seq,
              same_day_visit_count: visit.same_day_visit_count,
            })
          }
        })
      )

      const normalizedPatients = patients.map((patient) => {
        const derived = derivedVisitMap.get(patient.id)
        if (!derived) return patient
        return {
          ...patient,
          ...derived,
        }
      })

      const patientIds = normalizedPatients.map((p) => p.id)
      const thaiIds = Array.from(
        new Set(
          normalizedPatients
            .map((p) => p.thaiid?.trim() ?? '')
            .filter((v): v is string => v.length > 0)
        )
      )

      let checkpdThaiIdSet = new Set<string>()
      if (thaiIds.length > 0) {
        const { data: cpRows, error: cpErr } = await supabase
          .schema('checkpd')
          .from('record_summary')
          .select('thaiid')
          .in('thaiid', thaiIds)

        if (!cpErr && cpRows) {
          checkpdThaiIdSet = new Set(
            cpRows
              .map((r: { thaiid: string | null }) => r.thaiid?.trim() ?? '')
              .filter((v) => v.length > 0)
          )
        } else if (cpErr) {
          console.warn('checkpd.record_summary query failed:', cpErr.message)
        }
      }

      // --- Step 3: fetch related data for this page's patients ---
      const [diagRes, mocaRes, hamdRes, mdsRes, epwRes, smellRes, tmseRes, rbdRes, rome4Res, foodRes, visionRes] =
        await Promise.all([
          supabase.schema('core').from('patient_diagnosis_v2').select(DIAG_SELECT).in('patient_id', patientIds),
          supabase.schema('core').from('moca_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('hamd_v2').select('patient_id,total_score,severity_level').in('patient_id', patientIds),
          supabase.schema('core').from('mds_updrs_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('epworth_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('smell_test_v2').select('patient_id,total_score,recognize_count,perceive_count').in('patient_id', patientIds),
          supabase.schema('core').from('tmse_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('rbd_questionnaire_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('rome4_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('food_questionnaire_v2').select('patient_id,total_score').in('patient_id', patientIds),
          supabase.schema('core').from('vision_tests_v2')
            .select('patient_id,color_paper_re_test,color_paper_re_retest,color_paper_le_test,color_paper_le_retest,color_paper_re_test_order,color_paper_re_retest_order,color_paper_le_test_order,color_paper_le_retest_order')
            .in('patient_id', patientIds),
        ])

      const errors = [diagRes, mocaRes, hamdRes, mdsRes, epwRes, smellRes, tmseRes, rbdRes, rome4Res, foodRes, visionRes]
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
      const foodMap   = Object.fromEntries((foodRes.data   ?? []).map((d: QaScoreRow)    => [d.patient_id, d]))
      type VisionRow = {
        patient_id: number
        color_paper_re_test_order?: unknown[] | null
        color_paper_le_test_order?: unknown[] | null
        color_paper_re_test?: string | null
        color_paper_le_test?: string | null
      }
      const visionMap = Object.fromEntries((visionRes.data ?? []).map((d: VisionRow) => [d.patient_id, d]))

      setRows(normalizedPatients.map((p) => {
        const vis = visionMap[p.id] as VisionRow | undefined
        return {
          patient: p,
          diag:  diagMap[p.id] as QaDiagnosisRow | undefined,
          conditionLabel: formatQaConditionLabel(diagMap[p.id] as QaDiagnosisRow | undefined),
          has_checkpd: !!p.thaiid?.trim() && checkpdThaiIdSet.has(p.thaiid.trim()),
          moca:  mocaMap[p.id] as QaScoreRow | undefined,
          hamd:  hamdMap[p.id] as QaHamdRow | undefined,
          mds:   mdsMap[p.id] as QaScoreRow | undefined,
          epw:   epwMap[p.id] as QaScoreRow | undefined,
          smell: smellMap[p.id] as QaScoreRow | undefined,
          tmse:  tmseMap[p.id] as QaScoreRow | undefined,
          rbd:   rbdMap[p.id] as QaScoreRow | undefined,
          rome4: rome4Map[p.id] as QaScoreRow | undefined,
          food:  foodMap[p.id] as QaScoreRow | undefined,
          colorvision: vis
            ? {
                done: Boolean(vis.color_paper_re_test_order || vis.color_paper_le_test_order),
                summary: vis.color_paper_re_test ?? vis.color_paper_le_test ?? null,
              }
            : undefined,
        }
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [session, search, thaiId, condition, gp2, hyStage, province, startDate, endDate, currentPage, sortColumn, sortDirection])

  const handleSort = (column: QaSortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  const handleEdit = (patient: QaPatient) => {
    const row = rows.find((r) => r.patient.id === patient.id)
    setEditPatient(patient)
    setEditDiag(row?.diag ?? null)
    setPrefillPatient(null)
    setCreateOpen(true)
  }

  const handleAddVisit = (patient: QaPatient) => {
    setEditPatient(null)
    setEditDiag(null)
    setPrefillPatient(patient)
    setCreateOpen(true)
  }

  const handleDelete = async (patientId: number, name: string) => {
    if (!confirm(`ลบผู้ป่วย "${name}" และข้อมูลแบบทดสอบทั้งหมด?`)) return

    const childTables = [
      'patient_diagnosis_v2',
      'moca_v2',
      'hamd_v2',
      'mds_updrs_v2',
      'epworth_v2',
      'smell_test_v2',
      'tmse_v2',
      'rbd_questionnaire_v2',
      'rome4_v2',
    ]

    for (const table of childTables) {
      const { error: childErr } = await supabase.schema('core').from(table).delete().eq('patient_id', patientId)
      if (childErr) {
        setError(`Delete failed (${table}): ${childErr.message}`)
        return
      }
    }

    const { error: delErr } = await supabase.schema('core').from('patients_v2').delete().eq('id', patientId)
    if (delErr) {
      setError(`Delete failed: ${delErr.message}`)
      return
    }

    logActivity({ action: 'DELETE', page: 'qa', description: `ลบผู้ป่วย: ${name}`, userEmail: session?.user?.email })
    setRows((prev) => prev.filter((r) => r.patient.id !== patientId))
    setTotalCount((prev) => prev - 1)
  }
  const handleQuickDiag = useCallback(
    async (patientId: number, conditionValue: 'pd' | 'ctrl' | 'pdm' | 'other' | '-') => {
      const payload =
        conditionValue === '-'
          ? { patient_id: patientId, condition: '-', other_diagnosis_text: null }
          : { patient_id: patientId, condition: conditionValue }

      const { error: diagErr } = await supabase
        .schema('core')
        .from('patient_diagnosis_v2')
        .upsert(payload, { onConflict: 'patient_id' })

      if (diagErr) {
        setError(`Quick diagnosis update failed: ${diagErr.message}`)
        throw new Error(diagErr.message)
      }

      const target = rows.find((r) => r.patient.id === patientId)?.patient
      const patientName = target ? `${target.first_name ?? ''} ${target.last_name ?? ''}`.trim() : `ID ${patientId}`
      logActivity({
        action: 'UPDATE',
        page: 'qa',
        description: `อัปเดต condition แบบด่วน: ${patientName} -> ${conditionValue.toUpperCase()}`,
        userEmail: session?.user?.email,
      })

      await fetchData()
    },
    [fetchData, rows, session?.user?.email]
  )

  const openFocusedSummary = useCallback(
    async (focus: { id?: string | null; uid?: string | null }) => {
      if (!session) return

      const focusId = focus.id?.trim()
      const focusUid = focus.uid?.trim()
      if (!focusId && !focusUid) return

      try {
        let patientQuery = supabase
          .from('patient_visits_v2')
          .select(PATIENT_VISIT_SELECT)
          .limit(1)

        if (focusUid) {
          patientQuery = patientQuery
            .eq('patient_uid', focusUid)
            .order('submission_timestamp', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false, nullsFirst: false })
            .order('id', { ascending: false })
        } else if (focusId && /^\d+$/.test(focusId)) {
          patientQuery = patientQuery.eq('id', Number(focusId))
        } else {
          setError('Invalid QA focus link')
          return
        }

        const { data: patientData, error: patientErr } = await patientQuery.maybeSingle()
        if (patientErr) throw new Error(`patient_visits_v2: ${patientErr.message}`)
        if (!patientData) {
          setError('QA patient from link was not found')
          return
        }

        const patient = patientData as QaPatient
        const { data: diagData, error: diagErr } = await supabase
          .schema('core')
          .from('patient_diagnosis_v2')
          .select(DIAG_SELECT)
          .eq('patient_id', patient.id)
          .maybeSingle()

        if (diagErr) throw new Error(`patient_diagnosis_v2: ${diagErr.message}`)

        setSummaryRow({
          patient,
          diag: (diagData as QaDiagnosisRow | null) ?? undefined,
          conditionLabel: formatQaConditionLabel((diagData as QaDiagnosisRow | null) ?? undefined),
          has_checkpd: false,
          moca: undefined,
          hamd: undefined,
          mds: undefined,
          epw: undefined,
          smell: undefined,
          tmse: undefined,
          rbd: undefined,
          rome4: undefined,
          food: undefined,
          colorvision: undefined,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [session]
  )

  const handleModalClose = () => {
    setCreateOpen(false)
    setEditPatient(null)
    setEditDiag(null)
    setPrefillPatient(null)
  }

  useEffect(() => {
    if (sessionLoading || !session) return
    fetchData()
  }, [fetchData, sessionLoading, session])

  useEffect(() => {
    if (sessionLoading || !session || focusHandled) return

    const params = new URLSearchParams(window.location.search)
    const focusUid = params.get('focus_uid')
    const focusId = params.get('focus_id')
    if (!focusUid && !focusId) return

    setFocusHandled(true)
    openFocusedSummary({ id: focusId, uid: focusUid })
  }, [focusHandled, openFocusedSummary, session, sessionLoading])

  return (
    <SidebarLayout activePath="/pages/qa" mainClassName="bg-gray-50">
    <div className="mx-auto max-w-9xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">QA — Parkinson System</h1>
        <Button
          onClick={() => { setEditPatient(null); setEditDiag(null); setPrefillPatient(null); setCreateOpen(true) }}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" />
          เพิ่มผู้ป่วยใหม่
        </Button>
      </div>

      <QaPatientSummaryModal
        row={summaryRow}
        onUpdated={fetchData}
        onClose={() => setSummaryRow(null)}
      />

      <QaCreateModal
        open={createOpen}
        onClose={handleModalClose}
        role={role}
        prefillPatient={prefillPatient}
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

      {sessionLoading || loading ? (
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
            onQuickDiag={handleQuickDiag}
            onDelete={handleDelete}
            onDetail={setSummaryRow}
            onAddVisit={handleAddVisit}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
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

