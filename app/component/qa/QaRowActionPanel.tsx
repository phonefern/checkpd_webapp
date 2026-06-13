'use client'

import { useState } from 'react'
import { FileSearch, ClipboardList, Pencil, Trash2, Printer, CalendarPlus, Check, X } from 'lucide-react'
import type { AppRole } from '@/lib/access'
import {
  QaRow,
  QaPatient,
  isQaDiagnosed,
  getConditionColor,
  CONDITION_BADGE_CLASS,
  getScoreSeverity,
  SEVERITY_DOT_CLASS,
  SEVERITY_TEXT_CLASS,
} from './types'

interface Props {
  row: QaRow
  role: AppRole | null
  testsLocked: boolean
  onAssess: (patient: QaPatient) => void
  onEdit: (patient: QaPatient) => void
  onQuickDiag: (patientId: number, condition: 'pd' | 'ctrl' | 'pdm' | 'other' | '-') => Promise<void>
  onDelete: (patientId: number, name: string) => void
  onDetail: (row: QaRow) => void
  onAddVisit: (patient: QaPatient) => void
  onClose: () => void
}

const DIAG_OPTIONS = ['pd', 'pdm', 'ctrl', 'other', '-'] as const
type DiagOption = typeof DIAG_OPTIONS[number]

const DIAG_BUTTON_CLASS: Record<DiagOption, string> = {
  pd:    'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',
  pdm:   'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200',
  ctrl:  'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200',
  other: 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200',
  '-':   'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200',
}

const TEST_DEFS = [
  { key: 'moca',        label: 'MoCA',    max: 30 },
  { key: 'tmse',        label: 'TMSE',    max: 30 },
  { key: 'hamd',        label: 'HAM-D',   max: 52 },
  { key: 'mds',         label: 'MDS',     max: 199 },
  { key: 'epworth',     label: 'Epworth', max: 24 },
  { key: 'smell',       label: 'Smell',   max: 16 },
  { key: 'rbd',         label: 'RBD',     max: 100 },
  { key: 'rome4',       label: 'Rome IV', max: 6 },
  { key: 'food',        label: 'Food',    max: 10 },
  { key: 'colorvision', label: 'Vision',  max: null },
] as const

function getTestScore(row: QaRow, key: string): number | null {
  switch (key) {
    case 'moca':        return row.moca?.total_score  ?? null
    case 'tmse':        return row.tmse?.total_score  ?? null
    case 'hamd':        return row.hamd?.total_score  ?? null
    case 'mds':         return row.mds?.total_score   ?? null
    case 'epworth':     return row.epw?.total_score   ?? null
    case 'smell':       return row.smell?.total_score ?? null
    case 'rbd':         return row.rbd?.total_score   ?? null
    case 'rome4':       return row.rome4?.total_score ?? null
    case 'food':        return row.food?.total_score  ?? null
    case 'colorvision': return row.colorvision?.done ? 1 : null
    default:            return null
  }
}

export default function QaRowActionPanel({
  row, role, testsLocked,
  onAssess, onEdit, onQuickDiag, onDelete, onDetail, onAddVisit, onClose,
}: Props) {
  const { patient: p, diag, conditionLabel } = row
  const [confirmingDiag, setConfirmingDiag] = useState<DiagOption | null>(null)
  const [saving, setSaving] = useState(false)

  const isDiagnosedRow = isQaDiagnosed(diag)
  const isDocRole = role === 'doctor' || role === 'admin' || role === 'super_admin'
  const patientName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()

  const tests = TEST_DEFS.map((t) => ({ ...t, score: getTestScore(row, t.key) }))
  const doneCount = tests.filter((t) => t.score !== null).length

  const handleDiagConfirm = async () => {
    if (!confirmingDiag) return
    setSaving(true)
    try {
      await onQuickDiag(p.id, confirmingDiag)
      setConfirmingDiag(null)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:gap-5">

      {/* ── Left: identity + actions ───────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 min-w-[220px]">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-800 leading-tight">{patientName}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              HN: {p.hn_number ?? '—'} · อายุ {p.age ?? '—'} ปี · Visit {p.visit_no}/{p.total_visits}
            </p>
            {p.collection_date && (
              <p className="text-xs text-slate-400">{p.collection_date}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="ปิด"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Condition badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${CONDITION_BADGE_CLASS[getConditionColor(conditionLabel)]}`}
          >
            {conditionLabel === '-' || !conditionLabel ? 'ยังไม่วินิจฉัย' : conditionLabel}
          </span>
          {isDiagnosedRow && diag?.hy_stage && (
            <span className="text-xs text-slate-500">H&amp;Y {diag.hy_stage}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-1.5">
          <ActionBtn
            icon={<FileSearch className="h-3.5 w-3.5" />}
            label="Detail"
            onClick={() => { onDetail(row); onClose() }}
          />
          <ActionBtn
            icon={<ClipboardList className="h-3.5 w-3.5" />}
            label="Tests"
            disabled={testsLocked}
            onClick={() => { if (!testsLocked) { onAssess(p); onClose() } }}
          />
          <ActionBtn
            icon={<Pencil className="h-3.5 w-3.5" />}
            label="Edit"
            onClick={() => { onEdit(p); onClose() }}
          />
          <ActionBtn
            icon={<CalendarPlus className="h-3.5 w-3.5" />}
            label="Add Visit"
            onClick={() => { onAddVisit(p); onClose() }}
          />
          <ActionBtn
            icon={<Printer className="h-3.5 w-3.5" />}
            label="Print"
            onClick={() => window.open(`/api/qa-pdf?patient_id=${p.id}`, '_blank')}
          />
          <ActionBtn
            icon={<Trash2 className="h-3.5 w-3.5" />}
            label="Delete"
            variant="danger"
            onClick={() => { onDelete(p.id, patientName); onClose() }}
          />
        </div>

        {/* Quick diag — doctor / admin only, not yet diagnosed */}
        {isDocRole && !isDiagnosedRow && (
          <div className="mt-0.5 pt-2.5 border-t border-slate-200">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              วินิจฉัยด่วน
            </p>
            {confirmingDiag ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-700">
                  ยืนยัน: <strong className="text-slate-900">{confirmingDiag === '-' ? '—' : confirmingDiag.toUpperCase()}</strong>?
                </span>
                <button
                  disabled={saving}
                  onClick={handleDiagConfirm}
                  className="flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  <Check className="h-3 w-3" />
                  {saving ? 'Saving…' : 'ยืนยัน'}
                </button>
                <button
                  onClick={() => setConfirmingDiag(null)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {DIAG_OPTIONS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setConfirmingDiag(v)}
                    className={`h-7 rounded-full px-3 text-xs font-semibold transition-colors ${DIAG_BUTTON_CLASS[v]}`}
                  >
                    {v === '-' ? '—' : v.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right: score summary ─────────────────────────────────────────── */}
      <div className="flex-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2.5 sm:pt-0 sm:pl-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">ผลแบบทดสอบ</p>
          <span
            className={`text-[10px] font-semibold tabular-nums ${
              doneCount === tests.length ? 'text-green-600' : 'text-slate-400'
            }`}
          >
            {doneCount}/{tests.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
          {tests.map((t) => {
            const done = t.score !== null
            const sev = getScoreSeverity(t.key, t.score)
            return (
              <div key={t.key} className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs text-slate-600 shrink-0 w-16">{t.label}</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      done ? SEVERITY_DOT_CLASS[sev] : 'bg-slate-200'
                    }`}
                  />
                  {done ? (
                    <span className={`text-xs font-semibold tabular-nums ${SEVERITY_TEXT_CLASS[sev]}`}>
                      {t.key === 'colorvision'
                        ? (row.colorvision?.summary ?? '✓')
                        : `${t.score}${t.max !== null ? `/${t.max}` : ''}`}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-300">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

function ActionBtn({
  icon,
  label,
  onClick,
  disabled = false,
  variant = 'default',
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'danger'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed ${
          variant === 'danger'
            ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
        }`}
    >
      {icon}
      {label}
    </button>
  )
}
