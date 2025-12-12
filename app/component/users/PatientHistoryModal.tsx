'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PatientData } from '@/app/component/papers/types'
import { formatDate } from '@/app/component/papers/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

interface PatientHistoryModalProps {
  thaiid: string
  userData: {
    id: string
    firstname: string
    lastname: string
    age: number
    gender?: string
    province?: string
    prediction_risk?: boolean | null
    condition?: string
    other?: string
  }
  onClose: () => void
}

interface UserHistoryRecord {
  tremor_resting_hz: number | null
  tremor_postural_hz: number | null
  balance_hz: number | null
  gait_hz: number | null
  dualtap_left_count: number | null
  dualtap_right_count: number | null
  questionnaire_total_score: number | null
  voice_ahh_ts: string | null
  voice_ypl_ts: string | null
}

interface ScreeningRecord {
  id: number
  thaiid: string
  first_name: string
  last_name: string
  gender: string
  age: string
  province: string
  collection_date: string
  hn_number: string
  condition?: string
  other?: string
  weight?: string
  height?: string
  bmi?: string
  chest?: string
  waist?: string
  neck?: string
  hip?: string
  bp_supine?: string
  pr_supine?: string
  bp_upright?: string
  pr_upright?: string
}

type RiskFactors = NonNullable<PatientData['risk_factors']>

const DEFAULT_RISK_FACTORS: RiskFactors = {
  rome4_score: null,
  epworth_score: null,
  hamd_score: null,
  sleep_score: null,
  smell_score: null,
  mds_score: null,
  moca_score: null,
  tmse_score: null,
}

export default function PatientHistoryModal({ thaiid, userData, onClose }: PatientHistoryModalProps) {
  const [loading, setLoading] = useState(true)
  const [screeningRecords, setScreeningRecords] = useState<ScreeningRecord[]>([])
  const [selectedCollectionDate, setSelectedCollectionDate] = useState<string>('')
  const [currentPatient, setCurrentPatient] = useState<PatientData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userHistory, setUserHistory] = useState<UserHistoryRecord | null>(null)

  useEffect(() => {
    fetchPatientData()
    loadUserHistory()
  }, [thaiid])

  useEffect(() => {
    if (screeningRecords.length > 0 && selectedCollectionDate) {
      loadPatientData(selectedCollectionDate)
    }
  }, [selectedCollectionDate, screeningRecords])

  const fetchPatientData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all screening records for this thaiid
      const { data: screeningData, error: screeningError } = await supabase
        .from('pd_screenings')
        .select('id, thaiid, first_name, last_name, gender, age, province, collection_date, hn_number, condition, other, weight, height, bmi, chest, waist, neck, hip, bp_supine, pr_supine, bp_upright, pr_upright')
        .eq('thaiid', thaiid)
        .order('collection_date', { ascending: false })

      if (screeningError) {
        throw screeningError
      }

      if (!screeningData || screeningData.length === 0) {
        setError('ไม่พบข้อมูลการตรวจคัดกรอง')
        setLoading(false)
        return
      }

      setScreeningRecords(screeningData)

      // Set the first (most recent) collection_date as default
      if (screeningData.length > 0) {
        setSelectedCollectionDate(screeningData[0].collection_date)
      }
    } catch (err: any) {
      console.error('Error fetching screening data:', err)
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
      setLoading(false)
    }
  }

  const loadUserHistory = async () => {
    try {
      const { data, error: historyError } = await supabase
        .from('users_history')
        .select(
          'tremor_resting_hz, tremor_postural_hz, balance_hz, gait_hz, dualtap_left_count, dualtap_right_count, questionnaire_total_score, voice_ahh_ts, voice_ypl_ts'
        )
        .eq('thaiid', thaiid)
        .limit(1)
        .maybeSingle()

      if (historyError && historyError.code !== 'PGRST116') {
        console.error('Error fetching users_history data:', historyError)
        return
      }

      if (data) {
        setUserHistory({
          tremor_resting_hz: data.tremor_resting_hz ?? null,
          tremor_postural_hz: data.tremor_postural_hz ?? null,
          balance_hz: data.balance_hz ?? null,
          gait_hz: data.gait_hz ?? null,
          dualtap_left_count: data.dualtap_left_count ?? null,
          dualtap_right_count: data.dualtap_right_count ?? null,
          questionnaire_total_score: data.questionnaire_total_score ?? null,
          voice_ahh_ts: data.voice_ahh_ts ?? null,
          voice_ypl_ts: data.voice_ypl_ts ?? null,
        })
      } else {
        setUserHistory(null)
      }
    } catch (err) {
      console.error('Unexpected error fetching users_history:', err)
      setUserHistory(null)
    }
  }

  const normalizeRiskFactors = (payload: Partial<RiskFactors> | null): RiskFactors => ({
    rome4_score: payload?.rome4_score ?? null,
    epworth_score: payload?.epworth_score ?? null,
    hamd_score: payload?.hamd_score ?? null,
    sleep_score: payload?.sleep_score ?? null,
    smell_score: payload?.smell_score ?? null,
    mds_score: payload?.mds_score ?? null,
    moca_score: payload?.moca_score ?? null,
    tmse_score: payload?.tmse_score ?? null,
  })

  const loadPatientData = async (collectionDate: string) => {
    try {
      setLoading(true)
      setError(null)

      // Find the screening record for the selected collection_date
      const selectedRecord = screeningRecords.find(r => r.collection_date === collectionDate)
      if (!selectedRecord) {
        setError('ไม่พบข้อมูลสำหรับวันที่เลือก')
        setLoading(false)
        return
      }

      // Fetch risk factors data
      const { data: riskFactorsData, error: riskError } = await supabase
        .from('risk_factors_test')
        .select('rome4_score, epworth_score, hamd_score, sleep_score, smell_score, mds_score, moca_score, tmse_score')
        .eq('patient_id', selectedRecord.id)
        .maybeSingle()

      if (riskError && riskError.code !== 'PGRST116') {
        console.error('Error fetching risk factors:', riskError)
      }

      const riskFactors = normalizeRiskFactors(riskFactorsData ?? null)

      // Merge all data into PatientData format
      const patientData: PatientData = {
        id: selectedRecord.id,
        thaiid: selectedRecord.thaiid,
        first_name: selectedRecord.first_name || userData.firstname,
        last_name: selectedRecord.last_name || userData.lastname,
        gender: selectedRecord.gender || userData.gender || '',
        age: selectedRecord.age || userData.age.toString(),
        province: selectedRecord.province || userData.province || '',
        collection_date: selectedRecord.collection_date,
        hn_number: selectedRecord.hn_number || '',
        prediction_risk: userData.prediction_risk,
        condition: selectedRecord.condition || userData.condition,
        other: selectedRecord.other || userData.other,
        weight: selectedRecord.weight,
        height: selectedRecord.height,
        bmi: selectedRecord.bmi,
        chest: selectedRecord.chest,
        waist: selectedRecord.waist,
        neck: selectedRecord.neck,
        hip: selectedRecord.hip,
        bp_supine: selectedRecord.bp_supine,
        pr_supine: selectedRecord.pr_supine,
        bp_upright: selectedRecord.bp_upright,
        pr_upright: selectedRecord.pr_upright,
        risk_factors: riskFactors,
      }

      setCurrentPatient(patientData)
    } catch (err: any) {
      console.error('Error loading patient data:', err)
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }


  const formatHzValue = (value?: number | null): string => {
    if (value === null || typeof value === 'undefined') return '-'
    return `${value.toFixed(2)} Hz`
  }


  const getTremorSeverity = (hz?: number | null): { text: string, color: string } => {
    if (hz === null || typeof hz === 'undefined')
      return { text: 'ไม่พบข้อมูล', color: 'text-gray-500' }

    if (hz < 3.5)
      return { text: 'ปกติ', color: 'text-green-600' }

    if (hz < 4.5)
      return { text: 'เล็กน้อย', color: 'text-blue-600' }

    if (hz < 6.5)
      return { text: 'เข้าข่าย PD', color: 'text-yellow-600' }

    if (hz < 20.5)
      return { text: 'สั่นมาก', color: 'text-orange-600' }

    return { text: 'ข้อมูลผิดปกติ', color: 'text-gray-600' }
  }


  const getBalanceScore = (hz?: number | null): { text: string, color: string } => {
    if (hz === null || typeof hz === 'undefined')
      return { text: 'ไม่พบข้อมูล', color: 'text-gray-500' }

    if (hz < 0.5)
      return { text: 'ดีมาก (นิ่ง)', color: 'text-green-600' }

    if (hz < 1.0)
      return { text: 'ดี', color: 'text-blue-600' }

    if (hz < 2.0)
      return { text: 'ปานกลาง (เริ่มสั่น)', color: 'text-yellow-600' }

    return { text: 'ต้องระวัง (สั่นมากผิดปกติ)', color: 'text-red-600' }
  }

  const getGaitScore = (hz?: number | null): { text: string, color: string } => {
    if (hz === null || typeof hz === 'undefined')
      return { text: 'ไม่พบข้อมูล', color: 'text-gray-500' }

    if (hz > 1.5)
      return { text: 'ดีมาก (แกว่งแขนดี)', color: 'text-green-600' }

    if (hz > 1.0)
      return { text: 'ดี', color: 'text-blue-600' }

    if (hz > 0.6)
      return { text: 'ปานกลาง (แกว่งแขนลดลง)', color: 'text-yellow-600' }

    return { text: 'ต้องระวัง (แกว่งแขนน้อย)', color: 'text-red-600' }
  }


  const getDualtapScore = (count?: number | null): { text: string, color: string } => {
    if (count === null || typeof count === 'undefined')
      return { text: 'ไม่พบข้อมูล', color: 'text-gray-500' }

    if (count > 30)
      return { text: 'ดีมาก', color: 'text-green-600' }

    if (count > 22)
      return { text: 'ดี', color: 'text-blue-600' }

    if (count > 15)
      return { text: 'ปานกลาง', color: 'text-yellow-600' }

    return { text: 'มีโอกาสช้าผิดปกติ', color: 'text-red-600' }
  }

  const riskFactors = currentPatient?.risk_factors ?? DEFAULT_RISK_FACTORS
  const tremorRestingHz = userHistory?.tremor_resting_hz ?? null
  const tremorPosturalHz = userHistory?.tremor_postural_hz ?? null
  const balanceHz = userHistory?.balance_hz ?? null
  const gaitHz = userHistory?.gait_hz ?? null
  const dualLeft = userHistory?.dualtap_left_count ?? null;
  const dualRight = userHistory?.dualtap_right_count ?? null;
  const questionnaireScore = userHistory?.questionnaire_total_score ?? null
  const voiceAhhCompleted = Boolean(userHistory?.voice_ahh_ts)
  const voiceYplCompleted = Boolean(userHistory?.voice_ypl_ts)

  




  if (loading && !currentPatient) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-6xl bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !currentPatient) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-6xl bg-white rounded-xl shadow-lg p-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              ประวัติผู้ป่วย: {userData.firstname} {userData.lastname}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="px-6 py-5">
            <p className="text-red-600">{error}</p>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Patient Medical Record: {userData.firstname} {userData.lastname}
            </h3>
            <p className="text-sm text-slate-500 mt-1 font-mono">ID: {thaiid}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6 space-y-6 bg-slate-50">
          {/* Collection Date Selector */}
          {screeningRecords.length > 1 && (
            <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Collection Date:
              </label>
              <select
                value={selectedCollectionDate}
                onChange={(e) => setSelectedCollectionDate(e.target.value)}
                className="block w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
                disabled={loading}
              >
                {screeningRecords.map((record) => (
                  <option key={record.id} value={record.collection_date}>
                    {formatDate(record.collection_date)} {record.collection_date === selectedCollectionDate && '(Latest)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading && currentPatient && (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-500"></div>
            </div>
          )}

          {!loading && currentPatient && (
            <>
              {/* Interpretation Summary */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4  p-5 rounded-lg">
                <h4 className="font-bold text-slate-800 mb-3 text-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Interpretation Summary
                </h4>

                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                  <div className="space-y-6">

                    {/* 1. Key Findings */}
                    <section>
                      <p className="text-sm font-semibold text-slate-700 mb-2">
                        1. Key Findings
                      </p>

                      <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">

                        {/* Tremor */}
                        <li>
                          Resting Tremor:{" "}
                          <span className="font-semibold">{formatHzValue(tremorRestingHz)}</span>{" "}
                          {tremorRestingHz !== null && tremorRestingHz > 6 && "(High frequency — PD-range)"}
                        </li>

                        <li>
                          Postural Tremor:{" "}
                          <span className="font-semibold">{formatHzValue(tremorPosturalHz)}</span>{" "}
                          {tremorPosturalHz !== null && tremorPosturalHz > 5 && "(Elevated postural tremor)"}
                        </li>

                        {/* Balance */}
                        <li>
                          Balance Instability:{" "}
                          <span className="font-semibold">{formatHzValue(balanceHz)}</span>{" "}
                          {balanceHz !== null && balanceHz > 5 && "(High instability — abnormal sway)"}
                        </li>

                        {/* Gait */}
                        <li>
                          Gait Arm Swing Frequency:{" "}
                          <span className="font-semibold">{formatHzValue(gaitHz)}</span>{" "}
                          {gaitHz !== null && gaitHz < 1.0 && "(Reduced arm swing — gait difficulty)"}
                        </li>

                        {/* Dual Task Tapping */}
                        <li>
                          Dualtap (Left/Right):{" "}
                          <span className="font-semibold">
                            {dualLeft !== null ? dualLeft : "-"} / {dualRight !== null ? dualRight : "-"}
                          </span>{" "}
                          {(dualLeft !== null && dualLeft < 15) || (dualRight !== null && dualRight < 15)
                            ? "(Reduced tapping speed — bradykinesia pattern)"
                            : ""}
                        </li>

                        {/* Voice Tasks */}
                        <li>
                          Voice Tasks:{" "}
                          <span className="font-semibold">
                            {userHistory?.voice_ahh_ts ? "Ahh✓" : "Ahh–"},{" "}
                            {userHistory?.voice_ypl_ts ? "YPL✓" : "YPL–"}
                          </span>{" "}
                          {(!userHistory?.voice_ahh_ts || !userHistory?.voice_ypl_ts) &&
                            "(Incomplete voice task assessment)"}
                        </li>

                        {/* Cognitive Tests */}
                        {riskFactors.moca_score !== null && (
                          <li>
                            Cognitive Score (MOCA):{" "}
                            <span className="font-semibold">{riskFactors.moca_score}</span>{" "}
                            {riskFactors.moca_score < 26 && "(Below normal cognitive threshold)"}
                          </li>
                        )}

                        {riskFactors.tmse_score !== null && (
                          <li>
                            TMSE Score:{" "}
                            <span className="font-semibold">{riskFactors.tmse_score}</span>{" "}
                            {riskFactors.tmse_score < 24 && "(Below normal cognitive range)"}
                          </li>
                        )}

                        {/* Smell */}
                        {riskFactors.smell_score !== null && (
                          <li>
                            Smell Score:{" "}
                            <span className="font-semibold">{riskFactors.smell_score}</span>{" "}
                            {riskFactors.smell_score < 5 && "(Hyposmia detected — prodromal PD marker)"}
                          </li>
                        )}

                        {/* Sleep / Depression / Constipation */}
                        {riskFactors.epworth_score !== null && (
                          <li>
                            Epworth Sleepiness Score:{" "}
                            <span className="font-semibold">{riskFactors.epworth_score}</span>{" "}
                            {riskFactors.epworth_score >= 10 && "(Daytime sleepiness)"}
                          </li>
                        )}

                        {riskFactors.hamd_score !== null && (
                          <li>
                            HAMD Depression Score:{" "}
                            <span className="font-semibold">{riskFactors.hamd_score}</span>{" "}
                            {riskFactors.hamd_score >= 8 && "(Mild depressive symptoms)"}
                          </li>
                        )}

                        {riskFactors.sleep_score !== null && (
                          <li>
                            Sleep Score:{" "}
                            <span className="font-semibold">{riskFactors.sleep_score}</span>{" "}
                            {riskFactors.sleep_score >= 2 && "(Sleep disturbance)"}
                          </li>
                        )}

                        {riskFactors.rome4_score !== null && (
                          <li>
                            ROME IV Constipation Score:{" "}
                            <span className="font-semibold">{riskFactors.rome4_score}</span>{" "}
                            {riskFactors.rome4_score >= 2 && "(Constipation — common prodromal PD feature)"}
                          </li>
                        )}

                        {/* MDS Motor */}
                        {riskFactors.mds_score !== null && (
                          <li>
                            MDS-UPDRS Screening Score:{" "}
                            <span className="font-semibold">{riskFactors.mds_score}</span>
                          </li>
                        )}

                        {/* Questionnaire */}
                        {questionnaireScore !== null && (
                          <li>
                            Questionnaire Total Score:{" "}
                            <span className="font-semibold">{questionnaireScore}</span>{" "}
                            {questionnaireScore < 6 && "(Below screening threshold)"}
                          </li>
                        )}

                      </ul>
                    </section>





                    {/* 2. Digital Motor Pattern Classification */}
                    {userHistory && (
                      <section>
                        <p className="text-sm font-semibold text-slate-700 mb-2">
                          2. Digital Motor Pattern Classification
                        </p>

                        <p className="text-sm text-slate-700 leading-relaxed">
                          {tremorRestingHz !== null &&
                            tremorRestingHz > 5 &&
                            tremorPosturalHz !== null &&
                            tremorPosturalHz > 4 ? (
                            <>
                              Pattern suggests a <span className="font-semibold">Tremor-Dominant</span>{' '}
                              motor subtype.
                            </>
                          ) : (balanceHz !== null && balanceHz > 6) || (gaitHz !== null && gaitHz < 3) ? (
                            <>
                              Pattern shows features of{' '}
                              <span className="font-semibold">
                                Postural Instability / Gait Difficulty (PIGD)
                              </span>{' '}
                              subtype.
                            </>
                          ) : (
                            <>Digital motor pattern is nonspecific.</>
                          )}
                        </p>
                      </section>
                    )}
                  </div>
                </div>

              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 text-base flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Demographics
                  </h4>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-600 font-medium">Patient Name</span>
                      <span className="text-slate-900 font-semibold">{currentPatient.first_name} {currentPatient.last_name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-600 font-medium">Age</span>
                      <span className="text-slate-900">{currentPatient.age} years</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-600 font-medium">Sex</span>
                      <span className="text-slate-900">{currentPatient.gender}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-600 font-medium">Province</span>
                      <span className="text-slate-900">{currentPatient.province}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-600 font-medium">Hospital Number</span>
                      <span className="text-slate-900 font-mono">{currentPatient.hn_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-medium">Collection Date</span>
                      <span className="text-slate-900">{formatDate(currentPatient.collection_date)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 text-base flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Clinical Diagnosis
                  </h4>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-600 font-medium">Primary Condition</span>
                      <span className="text-slate-900">{currentPatient.condition || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-600 font-medium">Additional Notes</span>
                      <span className="text-slate-900">{currentPatient.other || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-600 font-medium">Risk Classification</span>
                      <span className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide ${currentPatient.prediction_risk === true
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : currentPatient.prediction_risk === false
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}>
                        {currentPatient.prediction_risk === true ? 'High Risk' : currentPatient.prediction_risk === false ? 'Low Risk' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Measurements */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-4 text-base flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Anthropometric Measurements
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="text-center p-4 bg-slate-50 rounded-md border border-slate-200">
                    <p className="text-slate-600 font-medium mb-1">Weight</p>
                    <p className="text-xl font-bold text-slate-900">{currentPatient.weight || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">kg</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-md border border-slate-200">
                    <p className="text-slate-600 font-medium mb-1">Height</p>
                    <p className="text-xl font-bold text-slate-900">{currentPatient.height || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">cm</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-md border border-slate-200">
                    <p className="text-slate-600 font-medium mb-1">BMI</p>
                    <p className="text-xl font-bold text-slate-900">{currentPatient.bmi || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">kg/m²</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-md border border-slate-200">
                    <p className="text-slate-600 font-medium mb-1">Waist</p>
                    <p className="text-xl font-bold text-slate-900">{currentPatient.waist || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">inches</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-md border border-slate-200">
                    <p className="text-slate-600 font-medium mb-1">Chest</p>
                    <p className="text-xl font-bold text-slate-900">{currentPatient.chest || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">inches</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-md border border-slate-200">
                    <p className="text-slate-600 font-medium mb-1">Neck</p>
                    <p className="text-xl font-bold text-slate-900">{currentPatient.neck || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">inches</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-md border border-slate-200">
                    <p className="text-slate-600 font-medium mb-1">Hip</p>
                    <p className="text-xl font-bold text-slate-900">{currentPatient.hip || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">inches</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-md border border-slate-200">
                    <p className="text-slate-600 font-medium mb-1">Blood Pressure</p>
                    <p className="text-xl font-bold text-slate-900">{currentPatient.bp_supine || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">mmHg</p>
                  </div>
                </div>
              </div>

              {/* Digital Assessment Results */}
              {userHistory && (
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 text-base flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Digital Biomarker Assessment
                  </h4>

                  {/* Tremor Assessment */}
                  <div className="mb-5">
                    <h5 className="text-slate-700 font-semibold mb-3 text-sm uppercase tracking-wide">Tremor Analysis</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-700 font-medium text-sm">Resting Tremor</span>
                          <span className="text-lg font-bold text-slate-900">{formatHzValue(tremorRestingHz)}</span>
                        </div>
                        <div className={`text-xs font-medium ${getTremorSeverity(tremorRestingHz).color}`}>
                          {getTremorSeverity(tremorRestingHz).text}
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-700 font-medium text-sm">Postural Tremor</span>
                          <span className="text-lg font-bold text-slate-900">{formatHzValue(tremorPosturalHz)}</span>
                        </div>
                        <div className={`text-xs font-medium ${getTremorSeverity(tremorPosturalHz).color}`}>
                          {getTremorSeverity(tremorPosturalHz).text}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Motor Function Assessment */}
                  <div className="mb-5">
                    <h5 className="text-slate-700 font-semibold mb-3 text-sm uppercase tracking-wide">Motor Function</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-700 font-medium text-sm">Balance</span>
                          <span className="text-lg font-bold text-slate-900">{formatHzValue(balanceHz)}</span>
                        </div>
                        <div className={`text-xs font-medium ${getBalanceScore(balanceHz).color}`}>
                          {getBalanceScore(balanceHz).text}
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-700 font-medium text-sm">Gait Analysis</span>
                          <span className="text-lg font-bold text-slate-900">{formatHzValue(gaitHz)}</span>
                        </div>
                        <div className={`text-xs font-medium ${getGaitScore(gaitHz).color}`}>
                          {getGaitScore(gaitHz).text}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dualtap Assessment */}
                  <div className="mb-5">
                    <h5 className="text-slate-700 font-semibold mb-3 text-sm uppercase tracking-wide">Bilateral Finger Tapping</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-700 font-medium text-sm">Left Hand</span>
                          <span className="text-lg font-bold text-slate-900">{dualLeft ?? '—'}</span>
                        </div>
                        <div className={`text-xs font-medium ${getDualtapScore(dualLeft).color}`}>
                          {getDualtapScore(dualLeft).text}
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-700 font-medium text-sm">Right Hand</span>
                          <span className="text-lg font-bold text-slate-900">{dualRight ?? '—'}</span>
                        </div>
                        <div className={`text-xs font-medium ${getDualtapScore(dualRight).color}`}>
                          {getDualtapScore(dualRight).text}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Other Assessments */}
                  <div>
                    <h5 className="text-slate-700 font-semibold mb-3 text-sm uppercase tracking-wide">Additional Assessments</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-700 font-medium text-sm">Questionnaire Score</span>
                          <span className="text-lg font-bold text-slate-900">{questionnaireScore ?? '—'}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-700 font-medium text-sm">Voice "Ahh"</span>
                          <span className={`text-sm font-bold ${voiceAhhCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                            {voiceAhhCompleted ? '✓ Complete' : '○ Pending'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-700 font-medium text-sm">Voice "YPL"</span>
                          <span className={`text-sm font-bold ${voiceYplCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                            {voiceYplCompleted ? '✓ Complete' : '○ Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Assessment Scores */}
              {currentPatient.risk_factors && (
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 text-base flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Risk Factor Scores
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(riskFactors).map(([key, value]) => (
                      <div key={key} className="text-center p-4 bg-slate-50 rounded-md border border-slate-200">
                        <p className="text-slate-600 font-medium text-xs mb-1 uppercase tracking-wide">
                          {key.replace('_score', '').replace('_', ' ')}
                        </p>
                        <p className="text-xl font-bold text-slate-900">{value !== null ? value : '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-5 border-t border-slate-200 flex items-center justify-end gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}