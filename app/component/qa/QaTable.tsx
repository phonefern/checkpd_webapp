'use client'

import { Fragment, useMemo, useState } from 'react'
import {
  QaRow, QaPatient, hasQaGp2, isQaDiagnosed,
  getConditionColor, CONDITION_BADGE_CLASS,
  getScoreSeverity, SEVERITY_DOT_CLASS,
} from './types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, ClipboardList, Pencil, Trash2, Printer, FileSearch, CalendarPlus } from 'lucide-react'
import type { AppRole } from '@/lib/access'
import QaRowActionPanel from './QaRowActionPanel'

const TEST_DOTS = [
  { key: 'moca',        label: 'MoCA' },
  { key: 'tmse',        label: 'TMSE' },
  { key: 'hamd',        label: 'HAM-D' },
  { key: 'mds',         label: 'MDS' },
  { key: 'epworth',     label: 'Epworth' },
  { key: 'smell',       label: 'Smell' },
  { key: 'rbd',         label: 'RBD' },
  { key: 'rome4',       label: 'Rome IV' },
  { key: 'food',        label: 'Food' },
  { key: 'colorvision', label: 'Vision' },
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

interface QaTableProps {
  rows: QaRow[]
  role: AppRole | null
  onAssess: (patient: QaPatient) => void
  onEdit: (patient: QaPatient) => void
  onQuickDiag: (patientId: number, condition: 'pd' | 'ctrl' | 'pdm' | 'other' | '-') => Promise<void>
  onDelete: (patientId: number, name: string) => void
  onDetail: (row: QaRow) => void
  onAddVisit: (patient: QaPatient) => void
}

const TOTAL_COLS = 11

export default function QaTable({ rows, role, onAssess, onEdit, onQuickDiag, onDelete, onDetail, onAddVisit }: QaTableProps) {
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null)
  const [savingDiagRowId, setSavingDiagRowId] = useState<number | null>(null)

  const useModalForDiag = role === 'doctor' || role === 'admin' || role === 'super_admin'

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const aTime = toUnixMs(a.patient.submission_timestamp ?? a.patient.created_at)
        const bTime = toUnixMs(b.patient.submission_timestamp ?? b.patient.created_at)
        if (aTime !== bTime) return bTime - aTime
        return b.patient.id - a.patient.id
      }),
    [rows]
  )

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground border rounded p-6 text-center">
        No records found for the selected filters
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="hidden lg:table-cell px-3 py-2 text-left font-medium">ID</th>
            <th className="px-3 py-2 text-center font-medium">Visit No</th>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">HN</th>
            <th className="hidden md:table-cell px-3 py-2 text-center font-medium">Age</th>
            <th className="hidden md:table-cell px-3 py-2 text-left font-medium">Province</th>
            <th className="px-3 py-2 text-left font-medium">Collection date</th>
            <th className="px-3 py-2 text-left font-medium">Condition</th>
            <th className="hidden md:table-cell px-3 py-2 text-center font-medium">GP2</th>
            <th className="px-3 py-2 text-center font-medium">Diag Status</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const { patient: p, diag, conditionLabel } = row
            const isDiagnosedRow = isQaDiagnosed(diag)
            const hasGp2Value = hasQaGp2(diag)
            const isMedicalStaff = role === 'medical_staff'
            const testsLocked = isMedicalStaff && isDiagnosedRow
            const hasSameDayDup = p.same_day_visit_count > 1
            const submissionTimeLabel = formatVisitCreatedAt(p.submission_timestamp ?? p.created_at)
            const isExpanded = expandedRowId === p.id
            const condColor = getConditionColor(conditionLabel)

            const testDots = TEST_DOTS.map((t) => {
              const score = getTestScore(row, t.key)
              const done  = score !== null
              return { ...t, score, done, sev: getScoreSeverity(t.key, score) }
            })
            const doneCount = testDots.filter((t) => t.done).length

            return (
              <Fragment key={p.id}>
                {/* ── Data row ─────────────────────────────────────────────── */}
                <tr
                  className={`border-b border-slate-200 cursor-pointer transition-colors select-none ${
                    isExpanded
                      ? 'bg-blue-50/70'
                      : 'hover:bg-muted/30'
                  }`}
                  onClick={(e) => {
                    const target = e.target as HTMLElement
                    if (target.closest('button') || target.closest('[role="menuitem"]') || target.closest('[role="menu"]')) return
                    setExpandedRowId((prev) => (prev === p.id ? null : p.id))
                  }}
                >
                  {/* ID */}
                  <td className="hidden lg:table-cell px-3 py-2 font-mono text-xs text-muted-foreground">
                    {p.id}
                  </td>

                  {/* Visit No */}
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      {p.visit_no}
                    </span>
                    {hasSameDayDup && (
                      <div className="mt-1">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          Same-day {p.same_day_visit_seq}/{p.same_day_visit_count}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Name + test dots */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{p.first_name} {p.last_name}</span>
                      {row.has_checkpd && (
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.18)] motion-safe:animate-pulse [animation-duration:2.2s]"
                          title="มีข้อมูล CheckPD"
                        />
                      )}
                    </div>
                    {/* Test completion dots — desktop */}
                    <div className="mt-1 hidden sm:flex items-center gap-0.5">
                      {testDots.map((t) => (
                        <span
                          key={t.key}
                          title={`${t.label}: ${t.done ? t.score : 'ยังไม่ได้ทำ'}`}
                          className={`inline-block h-2 w-2 rounded-full transition-colors ${
                            t.done ? SEVERITY_DOT_CLASS[t.sev] : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    {/* Compact count — mobile/tablet */}
                    <div className="mt-0.5 sm:hidden">
                      <span className={`text-[10px] font-medium ${doneCount === 10 ? 'text-green-600' : 'text-slate-400'}`}>
                        {doneCount}/10 tests
                      </span>
                    </div>
                  </td>

                  {/* HN */}
                  <td className="px-3 py-2 font-mono text-xs">{p.hn_number ?? '-'}</td>

                  {/* Age */}
                  <td className="hidden md:table-cell px-3 py-2 text-center">{p.age ?? '-'}</td>

                  {/* Province */}
                  <td className="hidden md:table-cell px-3 py-2">{p.province ?? '-'}</td>

                  {/* Collection date */}
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    <div>{p.collection_date ?? '-'}</div>
                    {submissionTimeLabel && (
                      <div className="text-[10px] text-muted-foreground">{submissionTimeLabel}</div>
                    )}
                  </td>

                  {/* Condition badge */}
                  <td className="px-3 py-2">
                    {conditionLabel === '-' || !conditionLabel ? (
                      <span className="text-slate-400 text-xs">—</span>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${CONDITION_BADGE_CLASS[condColor]}`}
                      >
                        {conditionLabel}
                      </span>
                    )}
                  </td>

                  {/* GP2 */}
                  <td className="hidden md:table-cell px-3 py-2 text-center">
                    {hasGp2Value ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        GP2
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* Diag Status */}
                  <td className="px-3 py-2 text-center">
                    {isDiagnosedRow ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        วินิจฉัยแล้ว
                      </span>
                    ) : useModalForDiag ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(p)
                        }}
                        className="h-8 rounded-full bg-cyan-600 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-cyan-700 hover:shadow-md motion-safe:animate-pulse"
                      >
                        Diag
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            disabled={savingDiagRowId === p.id}
                            onClick={(e) => e.stopPropagation()}
                            className="h-8 rounded-full bg-cyan-600 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-cyan-700 hover:shadow-md motion-safe:animate-pulse disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingDiagRowId === p.id ? 'Saving...' : 'Diag'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" sideOffset={6} className="min-w-[140px]">
                          <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-slate-500">
                            Select Condition
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {([
                            { value: 'pd', label: 'PD' },
                            { value: 'ctrl', label: 'CTRL' },
                            { value: 'pdm', label: 'PDM' },
                            { value: 'other', label: 'OTHER' },
                            { value: '-', label: '-' },
                          ] as const).map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!window.confirm(`ยืนยันการวินิจฉัยเป็น ${option.label} ใช่หรือไม่?`)) return
                                setSavingDiagRowId(p.id)
                                try {
                                  await onQuickDiag(p.id, option.value)
                                } finally {
                                  setSavingDiagRowId(null)
                                }
                              }}
                              className="cursor-pointer"
                            >
                              {option.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>

                  {/* Actions ⋯ */}
                  <td className="px-3 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 rounded-md border border-slate-200 bg-white p-0 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-lg border-slate-200 bg-white p-1.5 shadow-lg">
                        <DropdownMenuLabel className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Patient actions
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="mx-1 my-1 bg-slate-200" />
                        <DropdownMenuItem onClick={() => onDetail(row)} className="cursor-pointer rounded-md px-2.5 py-2 text-slate-700 focus:bg-slate-100">
                          <FileSearch className="mr-2 h-4 w-4 text-slate-500" /> Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAddVisit(p)} className="cursor-pointer rounded-md px-2.5 py-2 text-slate-700 focus:bg-slate-100">
                          <CalendarPlus className="mr-2 h-4 w-4 text-slate-500" /> Add Visit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/api/qa-pdf?patient_id=${p.id}`, '_blank')} className="cursor-pointer rounded-md px-2.5 py-2 text-slate-700 focus:bg-slate-100">
                          <Printer className="mr-2 h-4 w-4 text-slate-500" /> Print
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => !testsLocked && onAssess(p)}
                          disabled={testsLocked}
                          className={testsLocked ? 'cursor-not-allowed rounded-md px-2.5 py-2 text-slate-400 opacity-60' : 'cursor-pointer rounded-md px-2.5 py-2 text-slate-700 focus:bg-slate-100'}
                        >
                          <ClipboardList className="mr-2 h-4 w-4 text-slate-500" /> Tests
                          {testsLocked && <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-slate-400">Locked</span>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(p)} className="cursor-pointer rounded-md px-2.5 py-2 text-slate-700 focus:bg-slate-100">
                          <Pencil className="mr-2 h-4 w-4 text-slate-500" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="mx-1 my-1 bg-slate-200" />
                        <DropdownMenuItem
                          onClick={() => onDelete(p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim())}
                          className="cursor-pointer rounded-md px-2.5 py-2 text-red-700 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4 text-red-600" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>

                {/* ── Slide-down action panel ───────────────────────────────── */}
                <tr className="border-b border-slate-200">
                  <td colSpan={TOTAL_COLS} className="p-0">
                    <div
                      className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                        isExpanded
                          ? 'max-h-[520px] opacity-100'
                          : 'max-h-0 opacity-0 pointer-events-none'
                      }`}
                    >
                      <div
                        className={`transform transition-transform duration-300 ease-out px-4 py-3
                          bg-gradient-to-b from-blue-50/80 to-slate-50/40
                          border-l-4 border-blue-400
                          ${isExpanded ? 'translate-y-0' : '-translate-y-2'}`}
                      >
                        <QaRowActionPanel
                          row={row}
                          role={role}
                          testsLocked={testsLocked}
                          onAssess={onAssess}
                          onEdit={onEdit}
                          onQuickDiag={onQuickDiag}
                          onDelete={onDelete}
                          onDetail={onDetail}
                          onAddVisit={onAddVisit}
                          onClose={() => setExpandedRowId(null)}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function toUnixMs(value: string | null | undefined): number {
  if (!value) return 0
  const ts = Date.parse(value)
  return Number.isNaN(ts) ? 0 : ts
}

function formatVisitCreatedAt(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `submitted ${date.toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`
}
