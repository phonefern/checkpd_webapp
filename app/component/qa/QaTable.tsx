'use client'

import { QaRow, QaPatient, hasQaGp2, isQaDiagnosed } from './types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, ClipboardList, Pencil, Trash2, Printer, FileSearch } from 'lucide-react'
import type { AppRole } from '@/lib/access'

interface QaTableProps {
  rows: QaRow[]
  role: AppRole | null
  onAssess: (patient: QaPatient) => void
  onEdit: (patient: QaPatient) => void
  onDelete: (patientId: number, name: string) => void
  onDetail: (row: QaRow) => void
}

export default function QaTable({ rows, role, onAssess, onEdit, onDelete, onDetail }: QaTableProps) {
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
            <th className="px-3 py-2 text-left font-medium">ID</th>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">HN</th>
            <th className="px-3 py-2 text-center font-medium">Age</th>
            <th className="px-3 py-2 text-left font-medium">Province</th>
            <th className="px-3 py-2 text-left font-medium">Collection date</th>
            <th className="px-3 py-2 text-center font-medium">BMI</th>
            <th className="px-3 py-2 text-left font-medium">Condition</th>
            <th className="px-3 py-2 text-center font-medium">H&amp;Y</th>
            <th className="px-3 py-2 text-left font-medium">Disease duration</th>
            <th className="px-3 py-2 text-center font-medium">GP2</th>
            <th className="px-3 py-2 text-center font-medium">Diag Status</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => {
            const { patient: p, diag, conditionLabel } = row
            const isDiagnosedRow = isQaDiagnosed(diag)
            const hasGp2Value = hasQaGp2(diag)
            const isMedicalStaff = role === 'medical_staff'
            const testsLocked = isMedicalStaff && isDiagnosedRow

            return (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.id}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.first_name} {p.last_name}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.hn_number ?? '-'}</td>
                <td className="px-3 py-2 text-center">{p.age ?? '-'}</td>
                <td className="px-3 py-2">{p.province ?? '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs">{p.collection_date ?? '-'}</td>
                <td className="px-3 py-2 text-center">{p.bmi != null ? Number(p.bmi).toFixed(1) : '-'}</td>
                <td className="px-3 py-2">{conditionLabel}</td>
                <td className="px-3 py-2 text-center">{diag?.hy_stage ?? '-'}</td>
                <td className="px-3 py-2 text-center">{diag?.disease_duration ?? '-'}</td>
                <td className="px-3 py-2 text-center">
                  {hasGp2Value ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      GP2
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {isDiagnosedRow ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      วินิจฉัยแล้ว
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                      รอวินิจฉัย
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-md border border-slate-200 bg-white p-0 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-52 rounded-lg border-slate-200 bg-white p-1.5 shadow-lg"
                    >
                      <DropdownMenuLabel className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Patient actions
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="mx-1 my-1 bg-slate-200" />
                      <DropdownMenuItem
                        onClick={() => onDetail(row)}
                        className="cursor-pointer rounded-md px-2.5 py-2 text-slate-700 focus:bg-slate-100 focus:text-slate-950"
                      >
                        <FileSearch className="mr-2 h-4 w-4 text-slate-500" />
                        Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => window.open(`/api/qa-pdf?patient_id=${p.id}`, '_blank')}
                        className="cursor-pointer rounded-md px-2.5 py-2 text-slate-700 focus:bg-slate-100 focus:text-slate-950"
                      >
                        <Printer className="mr-2 h-4 w-4 text-slate-500" />
                        Print
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => !testsLocked && onAssess(p)}
                        disabled={testsLocked}
                        className={
                          testsLocked
                            ? 'cursor-not-allowed rounded-md px-2.5 py-2 text-slate-400 opacity-60'
                            : 'cursor-pointer rounded-md px-2.5 py-2 text-slate-700 focus:bg-slate-100 focus:text-slate-950'
                        }
                      >
                        <ClipboardList className="mr-2 h-4 w-4 text-slate-500" />
                        Tests
                        {testsLocked && <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-slate-400">Locked</span>}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onEdit(p)}
                        className="cursor-pointer rounded-md px-2.5 py-2 text-slate-700 focus:bg-slate-100 focus:text-slate-950"
                      >
                        <Pencil className="mr-2 h-4 w-4 text-slate-500" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="mx-1 my-1 bg-slate-200" />
                      <DropdownMenuItem
                        onClick={() => onDelete(p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim())}
                        className="cursor-pointer rounded-md px-2.5 py-2 text-red-700 focus:bg-red-50 focus:text-red-800"
                      >
                        <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
