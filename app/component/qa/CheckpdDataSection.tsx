'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeQaConditionValue, type CheckpdRecordSummary, type QaConditionFilter } from './types'

interface Props {
  patientId: number
  thaiid: string | null | undefined
  coreCondition: string | null | undefined
  onSynced?: () => void | Promise<void>
}

export default function CheckpdDataSection({ patientId, thaiid, coreCondition }: Props) {
  const [cpLoading, setCpLoading] = useState(false)
  const [cpRows, setCpRows] = useState<CheckpdRecordSummary[]>([])
  const [cpError, setCpError] = useState<string | null>(null)
  const [coreConditionState, setCoreConditionState] = useState<QaConditionFilter>(normalizeQaConditionValue(coreCondition))

  useEffect(() => {
    setCoreConditionState(normalizeQaConditionValue(coreCondition))
  }, [coreCondition, patientId])

  useEffect(() => {
    const normalizedThaiId = thaiid?.trim() ?? ''
    if (!normalizedThaiId) {
      setCpRows([])
      setCpError(null)
      setCpLoading(false)
      return
    }

    let cancelled = false
    setCpLoading(true)
    setCpError(null)

    const fetchCheckpdData = async () => {
      const { data, error } = await supabase
        .schema('checkpd')
        .from('record_summary')
        .select(
          'user_id,recorder,record_id,source_collection,prediction_risk,condition,condition_status,condition_changed_at,test_result,other,' +
          'tremor_resting_hz,tremor_postural_hz,balance_hz,gait_hz,' +
          'dual_tap_left_score,dual_tap_right_score,questionnaire_total,' +
          'voice_ahh_ts,voice_ypl_ts,last_record_at,updated_at,thaiid'
        )
        .eq('thaiid', normalizedThaiId)
        .order('last_record_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false, nullsFirst: false })

      if (cancelled) return
      if (error) {
        setCpError(error.message)
        setCpRows([])
      } else {
        const safeRows = Array.isArray(data) ? (data as unknown as CheckpdRecordSummary[]) : []
        setCpRows(safeRows)
      }
      if (!cancelled) setCpLoading(false)
    }

    fetchCheckpdData()

    return () => {
      cancelled = true
    }
  }, [thaiid, patientId])

  const latestRow = cpRows[0]
  const syncSourceRow = latestRow
  const checkpdMainConditionRaw = syncSourceRow?.condition?.trim() ?? ''
  const checkpdMainConditionMapped = useMemo(
    () => normalizeQaConditionValue(checkpdMainConditionRaw),
    [checkpdMainConditionRaw]
  )
  const compareStatus =
    !checkpdMainConditionMapped || !coreConditionState
      ? '-'
      : checkpdMainConditionMapped === coreConditionState
        ? 'Matched'
        : 'Different'

  return (
    <section className="mt-6 rounded-xl bg-teal-50/30 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">CheckPD Data</h3>

      {cpLoading && (
        <div className="space-y-2">
          <div className="h-16 animate-pulse rounded-lg bg-slate-200/70" />
          <div className="h-16 animate-pulse rounded-lg bg-slate-200/70" />
        </div>
      )}

      {!cpLoading && (
        <div className="mb-3 rounded-lg bg-white p-3 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Condition Compare
          </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-slate-500">Screening Condition:</span>{' '}
                <span className="font-semibold text-slate-900">{formatConditionCode(coreConditionState)}</span>
              </div>
              <div>
                <span className="text-slate-500">CheckPD Main Condition:</span>{' '}
                <span className="font-semibold text-slate-900">
                  {checkpdMainConditionRaw || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Source record_id:</span>{' '}
                <span className="font-semibold text-slate-900">{syncSourceRow?.record_id || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500">Compare Status:</span>{' '}
                <span className="font-semibold text-slate-900">{compareStatus}</span>
              </div>
            </div>
        </div>
      )}

      {!cpLoading && !thaiid?.trim() && (
        <div className="text-sm text-slate-500">ไม่พบข้อมูล CheckPD สำหรับผู้ป่วยรายนี้</div>
      )}

      {!cpLoading && !!thaiid?.trim() && cpRows.length === 0 && !cpError && (
        <div className="text-sm text-slate-500">ไม่พบข้อมูล CheckPD สำหรับผู้ป่วยรายนี้</div>
      )}

      {cpError && (
        <div className="text-sm text-red-600">โหลดข้อมูล CheckPD ไม่สำเร็จ: {cpError}</div>
      )}

      {!cpLoading && cpRows.length > 0 && (
        <div className="mt-3 space-y-2">
          {cpRows.map((item, index) => (
            <details key={`${item.record_id ?? item.user_id}-${item.recorder}`} open={index === 0} className="rounded-lg bg-white p-3 shadow-sm">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                {formatDateTime(item.last_record_at)} · recorder={item.recorder || '-'} · {item.source_collection || '-'}
              </summary>
              <div className="mt-3 grid gap-x-6 gap-y-1 text-sm md:grid-cols-2">
                <DataRow label="Risk" value={formatRisk(item.prediction_risk)} />
                <DataRow label="Main Condition" value={item.condition} />
                <DataRow label="Record ID" value={item.record_id} />
                <DataRow label="Condition Status" value={formatConditionStatus(item.condition_status, item.condition_changed_at)} />
                <DataRow label="Test Result" value={item.test_result} />
                <DataRow label="Questionnaire" value={item.questionnaire_total != null ? `${item.questionnaire_total}/20` : '-'} />
                <DataRow label="Tremor Resting" value={formatHz(item.tremor_resting_hz)} />
                <DataRow label="Tremor Postural" value={formatHz(item.tremor_postural_hz)} />
                <DataRow label="Balance" value={formatHz(item.balance_hz)} />
                <DataRow label="Gait" value={formatHz(item.gait_hz)} />
                <DataRow label="Tap Left / Right" value={formatTap(item.dual_tap_left_score, item.dual_tap_right_score)} />
                <DataRow label="Voice AHH / YPL" value={formatVoicePair(item.voice_ahh_ts, item.voice_ypl_ts)} />
                <DataRow label="Other" value={item.other} />
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  )
}

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-slate-500">{label}:</span>{' '}
      <span className="font-medium text-slate-900">{value?.trim() || '-'}</span>
    </div>
  )
}

function formatConditionCode(value: QaConditionFilter): string {
  if (!value) return '-'
  return value.toUpperCase()
}

function formatRisk(value: boolean | null): string {
  if (value === true) return 'Risk'
  if (value === false) return 'No risk'
  return 'Unknown'
}

function formatHz(value: number | null): string {
  return value == null ? '-' : `${Number(value).toFixed(3)} Hz`
}

function formatTap(left: number | null, right: number | null): string {
  if (left == null && right == null) return '-'
  return `${left ?? '-'} / ${right ?? '-'}`
}

function formatVoicePair(ahh: string | null, ypl: string | null): string {
  return `${ahh ? 'ทำแล้ว' : 'ยังไม่ทำ'} / ${ypl ? 'ทำแล้ว' : 'ยังไม่ทำ'}`
}

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('th-TH')
}

function formatConditionStatus(status: string | null, changedAt: string | null): string {
  if (!status) return '-'
  const changed = formatDateTime(changedAt)
  if (changed === '-') return status
  return `${status} (${changed})`
}
