'use client'

import { ClipboardList, FileText } from 'lucide-react'
import {
  QaRow,
  QaPatient,
  getScoreSeverity,
  SEVERITY_DOT_CLASS,
  CONDITION_BADGE_CLASS,
  getConditionColor,
} from './types'

interface Props {
  rows: QaRow[]
  onAssess: (patient: QaPatient) => void
  onDetail: (row: QaRow) => void
}

const TEST_DOTS: { key: keyof Pick<QaRow, 'moca' | 'tmse' | 'hamd' | 'mds' | 'epw' | 'smell' | 'rbd' | 'rome4' | 'food' | 'colorvision'>; sevKey: string }[] = [
  { key: 'moca',        sevKey: 'moca' },
  { key: 'tmse',        sevKey: 'tmse' },
  { key: 'hamd',        sevKey: 'hamd' },
  { key: 'mds',         sevKey: 'mds' },
  { key: 'epw',         sevKey: 'epworth' },
  { key: 'smell',       sevKey: 'smell' },
  { key: 'rbd',         sevKey: 'rbd' },
  { key: 'rome4',       sevKey: 'rome4' },
  { key: 'food',        sevKey: 'food' },
  { key: 'colorvision', sevKey: 'colorvision' },
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  } catch {
    return dateStr
  }
}

export default function QaPhoneCardList({ rows, onAssess, onDetail }: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <FileText className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">ไม่พบข้อมูล</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const { patient, diag, conditionLabel } = row
        const name = [patient.first_name, patient.last_name].filter(Boolean).join(' ') || '(ไม่มีชื่อ)'
        const condColor = getConditionColor(conditionLabel)
        const badgeClass = CONDITION_BADGE_CLASS[condColor]

        const doneDots = TEST_DOTS.map(({ key, sevKey }) => {
          const entry = row[key]
          if (!entry) return 'none' as const
          if (key === 'colorvision') {
            const cv = entry as { done: boolean }
            return cv.done ? ('good' as const) : ('none' as const)
          }
          const scoreEntry = entry as { total_score: number | null }
          return getScoreSeverity(sevKey, scoreEntry.total_score)
        })

        const doneCount = doneDots.filter((s) => s !== 'none').length

        return (
          <div
            key={patient.id}
            className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden active:bg-gray-50 transition"
          >
            {/* Card header — tap to assess */}
            <button
              className="w-full text-left px-4 pt-3 pb-2"
              onClick={() => onAssess(patient)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {patient.hn_number ? `HN ${patient.hn_number} · ` : ''}
                    Visit {patient.visit_no}
                    {patient.total_visits > 1 ? `/${patient.total_visits}` : ''}
                    {patient.age ? ` · ${patient.age} ปี` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {conditionLabel && conditionLabel !== '-' ? (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                      {conditionLabel}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                  {diag?.hy_stage && (
                    <span className="text-[10px] text-gray-500">H&amp;Y {diag.hy_stage}</span>
                  )}
                </div>
              </div>

              {/* Test dots + count */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-1">
                  {doneDots.map((sev, i) => (
                    <span
                      key={i}
                      className={`inline-block h-2 w-2 rounded-full ${SEVERITY_DOT_CLASS[sev]}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-400">{doneCount}/10</span>
              </div>

              {/* Date & province */}
              <p className="text-xs text-gray-400 mt-1">
                {formatDate(patient.collection_date)}
                {patient.province ? ` · ${patient.province}` : ''}
              </p>
            </button>

            {/* Action row */}
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => onAssess(patient)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-blue-600 active:bg-blue-50 transition"
              >
                <ClipboardList className="h-4 w-4" />
                แบบทดสอบ
              </button>
              <div className="w-px bg-gray-100" />
              <button
                onClick={() => onDetail(row)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-gray-600 active:bg-gray-50 transition"
              >
                <FileText className="h-4 w-4" />
                รายละเอียด
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
