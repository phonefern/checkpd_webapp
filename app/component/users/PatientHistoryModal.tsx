'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PatientData } from '@/app/component/papers/types'
import { formatDate } from '@/app/component/papers/utils'

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

export default function PatientHistoryModal({ thaiid, userData, onClose }: PatientHistoryModalProps) {
  const [loading, setLoading] = useState(true)
  const [screeningRecords, setScreeningRecords] = useState<ScreeningRecord[]>([])
  const [selectedCollectionDate, setSelectedCollectionDate] = useState<string>('')
  const [currentPatient, setCurrentPatient] = useState<PatientData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userHistory, setUserHistory] = useState<UserHistoryRecord | null>(null)

  useEffect(() => {
    fetchPatientData()
  }, [thaiid])

  useEffect(() => {
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
        risk_factors: riskFactorsData ? {
          rome4_score: riskFactorsData.rome4_score,
          epworth_score: riskFactorsData.epworth_score,
          hamd_score: riskFactorsData.hamd_score,
          sleep_score: riskFactorsData.sleep_score,
          smell_score: riskFactorsData.smell_score,
          mds_score: riskFactorsData.mds_score,
          moca_score: riskFactorsData.moca_score,
          tmse_score: riskFactorsData.tmse_score,
        } : {
          rome4_score: null,
          epworth_score: null,
          hamd_score: null,
          sleep_score: null,
          smell_score: null,
          mds_score: null,
          moca_score: null,
          tmse_score: null,
        }
      }

      setCurrentPatient(patientData)
    } catch (err: any) {
      console.error('Error loading patient data:', err)
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  // Function to format Hz values with proper unit
  const formatHzValue = (value: number | null): string => {
    if (value === null) return '-'
    return `${value.toFixed(2)} Hz`
  }

  // --- Tremor Severity (4–6 Hz = PD typical) ---
  const getTremorSeverity = (hz: number | null): { text: string, color: string } => {
    if (hz === null)
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


const getBalanceScore = (hz: number | null): { text: string, color: string } => {
  if (hz === null)
    return { text: 'ไม่พบข้อมูล', color: 'text-gray-500' }

  if (hz < 0.5)
    return { text: 'ดีมาก (นิ่ง)', color: 'text-green-600' }

  if (hz < 1.0)
    return { text: 'ดี', color: 'text-blue-600' }

  if (hz < 2.0)
    return { text: 'ปานกลาง (เริ่มสั่น)', color: 'text-yellow-600' }

  return { text: 'ต้องระวัง (สั่นมากผิดปกติ)', color: 'text-red-600' }
}

const getGaitScore = (hz: number | null): { text: string, color: string } => {
  if (hz === null)
    return { text: 'ไม่พบข้อมูล', color: 'text-gray-500' }

  if (hz > 1.5)
    return { text: 'ดีมาก (แกว่งแขนดี)', color: 'text-green-600' }

  if (hz > 1.0)
    return { text: 'ดี', color: 'text-blue-600' }

  if (hz > 0.6)
    return { text: 'ปานกลาง (แกว่งแขนลดลง)', color: 'text-yellow-600' }

  return { text: 'ต้องระวัง (แกว่งแขนน้อย)', color: 'text-red-600' }
}

  // Function to interpret dualtap score
  const getDualtapScore = (count: number | null): { text: string, color: string } => {
    if (count === null)
      return { text: 'ไม่พบข้อมูล', color: 'text-gray-500' }

    if (count > 30)
      return { text: 'ดีมาก', color: 'text-green-600' }

    if (count > 22)
      return { text: 'ดี', color: 'text-blue-600' }

    if (count > 15)
      return { text: 'ปานกลาง', color: 'text-yellow-600' }

    return { text: 'มีโอกาสช้าผิดปกติ', color: 'text-red-600' }
  }

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
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              ประวัติผู้ป่วย: {userData.firstname} {userData.lastname}
            </h3>
            <p className="text-sm text-gray-500 mt-1">รหัสประจำตัวประชาชน: {thaiid}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Collection Date Selector */}
          {screeningRecords.length > 1 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลือกวันที่เก็บข้อมูล:
              </label>
              <select
                value={selectedCollectionDate}
                onChange={(e) => setSelectedCollectionDate(e.target.value)}
                className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {screeningRecords.map((record) => (
                  <option key={record.id} value={record.collection_date}>
                    {formatDate(record.collection_date)} {record.collection_date === selectedCollectionDate && '(ล่าสุด)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading && currentPatient && (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!loading && currentPatient && (
            <>
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3 text-lg border-b pb-2">ข้อมูลพื้นฐาน</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">ชื่อ-สกุล:</span>
                      <span>{currentPatient.first_name} {currentPatient.last_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">อายุ:</span>
                      <span>{currentPatient.age} ปี</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">เพศ:</span>
                      <span>{currentPatient.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">จังหวัด:</span>
                      <span>{currentPatient.province}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">HN:</span>
                      <span>{currentPatient.hn_number || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">วันที่เก็บข้อมูล:</span>
                      <span>{formatDate(currentPatient.collection_date)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3 text-lg border-b pb-2">การวินิจฉัย</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Condition:</span>
                      <span>{currentPatient.condition || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Other:</span>
                      <span>{currentPatient.other || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-600">ความเสี่ยง:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${currentPatient.prediction_risk === true
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : currentPatient.prediction_risk === false
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}>
                        {currentPatient.prediction_risk === true ? 'มีความเสี่ยง' : currentPatient.prediction_risk === false ? 'ไม่มีความเสี่ยง' : 'ยังไม่ประเมิน'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Measurements */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3 text-lg border-b pb-2">การวัดร่างกาย</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="font-medium text-blue-700">น้ำหนัก</p>
                    <p className="text-lg font-semibold">{currentPatient.weight || '-'} <span className="text-sm">kg</span></p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="font-medium text-blue-700">ส่วนสูง</p>
                    <p className="text-lg font-semibold">{currentPatient.height || '-'} <span className="text-sm">cm</span></p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="font-medium text-blue-700">BMI</p>
                    <p className="text-lg font-semibold">{currentPatient.bmi || '-'}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="font-medium text-blue-700">รอบเอว</p>
                    <p className="text-lg font-semibold">{currentPatient.waist || '-'} <span className="text-sm">นิ้ว</span></p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="font-medium text-blue-700">รอบอก</p>
                    <p className="text-lg font-semibold">{currentPatient.chest || '-'} <span className="text-sm">นิ้ว</span></p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="font-medium text-blue-700">รอบคอ</p>
                    <p className="text-lg font-semibold">{currentPatient.neck || '-'} <span className="text-sm">นิ้ว</span></p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="font-medium text-blue-700">รอบสะโพก</p>
                    <p className="text-lg font-semibold">{currentPatient.hip || '-'} <span className="text-sm">นิ้ว</span></p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="font-medium text-blue-700">ความดันโลหิต</p>
                    <p className="text-lg font-semibold">{currentPatient.bp_supine || '-'} <span className="text-sm">mmHg</span></p>
                  </div>
                </div>
              </div>

              {/* Digital Assessment Results */}
              {userHistory && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3 text-lg border-b pb-2">ผลการทดสอบดิจิทัล</h4>

                  {/* Tremor Assessment */}
                  <div className="mb-6">
                    <h5 className="font-medium text-gray-700 mb-3 text-md">การประเมินการสั่น (Tremor Assessment)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-purple-700">Tremor Resting</span>
                          <span className="text-lg font-semibold">{formatHzValue(userHistory.tremor_resting_hz)}</span>
                        </div>
                        <div className={`text-sm mt-1 ${getTremorSeverity(userHistory.tremor_resting_hz).color}`}>
                          {getTremorSeverity(userHistory.tremor_resting_hz).text}
                        </div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-purple-700">Tremor Postural</span>
                          <span className="text-lg font-semibold">{formatHzValue(userHistory.tremor_postural_hz)}</span>
                        </div>
                        <div className={`text-sm mt-1 ${getTremorSeverity(userHistory.tremor_postural_hz).color}`}>
                          {getTremorSeverity(userHistory.tremor_postural_hz).text}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Motor Function Assessment */}
                  <div className="mb-6">
                    <h5 className="font-medium text-gray-700 mb-3 text-md">การประเมินการเคลื่อนไหว (Motor Function)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-green-700">Balance</span>
                          <span className="text-lg font-semibold">{formatHzValue(userHistory.balance_hz)}</span>
                        </div>
                        <div className={`text-sm mt-1 ${getBalanceScore(userHistory.balance_hz).color}`}>
                          {getBalanceScore(userHistory.balance_hz).text}
                        </div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-green-700">Gait</span>
                          <span className="text-lg font-semibold">{formatHzValue(userHistory.gait_hz)}</span>
                        </div>
                        <div className={`text-sm mt-1 ${getGaitScore(userHistory.gait_hz).color}`}>
                          {getGaitScore(userHistory.gait_hz).text}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dualtap Assessment */}
                  <div className="mb-6">
                    <h5 className="font-medium text-gray-700 mb-3 text-md">การทดสอบ Dualtap</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-orange-700">Dualtap Left</span>
                          <span className="text-lg font-semibold">{userHistory.dualtap_left_count ?? '-'}</span>
                        </div>
                        <div className={`text-sm mt-1 ${getDualtapScore(userHistory.dualtap_left_count).color}`}>
                          {getDualtapScore(userHistory.dualtap_left_count).text}
                        </div>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-orange-700">Dualtap Right</span>
                          <span className="text-lg font-semibold">{userHistory.dualtap_right_count ?? '-'}</span>
                        </div>
                        <div className={`text-sm mt-1 ${getDualtapScore(userHistory.dualtap_right_count).color}`}>
                          {getDualtapScore(userHistory.dualtap_right_count).text}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Other Assessments */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-indigo-700">Questionnaire</span>
                        <span className="text-lg font-semibold">{userHistory.questionnaire_total_score ?? '-'}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-indigo-700">Voice "Ahh"</span>
                        <span className={`text-sm font-medium ${userHistory.voice_ahh_ts ? 'text-green-600' : 'text-gray-500'}`}>
                          {userHistory.voice_ahh_ts ? '✓ ทำแล้ว' : 'ยังไม่ได้ทำ'}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-indigo-700">Voice "YPL"</span>
                        <span className={`text-sm font-medium ${userHistory.voice_ypl_ts ? 'text-green-600' : 'text-gray-500'}`}>
                          {userHistory.voice_ypl_ts ? '✓ ทำแล้ว' : 'ยังไม่ได้ทำ'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Assessment Scores */}
              {currentPatient.risk_factors && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3 text-lg border-b pb-2">คะแนนแบบประเมิน</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(currentPatient.risk_factors).map(([key, value]) => (
                      <div key={key} className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="font-medium text-amber-700 text-sm">
                          {key.replace('_score', '').replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-lg font-semibold">{value !== null ? value : '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}