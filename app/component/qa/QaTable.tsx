'use client'

import { QaRow, QaPatient } from './types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, ClipboardList, Pencil, Trash2, Printer } from 'lucide-react'

interface QaTableProps {
  rows: QaRow[]
  onAssess: (patient: QaPatient) => void
  onEdit: (patient: QaPatient) => void
  onDelete: (patientId: number, name: string) => void
}

export default function QaTable({ rows, onAssess, onEdit, onDelete }: QaTableProps) {
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
            <th className="px-3 py-2 text-left font-medium">Other diagnosis</th>
            <th className="px-3 py-2 text-center font-medium">MoCA</th>
            <th className="px-3 py-2 text-center font-medium">HAMD</th>
            <th className="px-3 py-2 text-center font-medium">MDS-UPDRS</th>
            <th className="px-3 py-2 text-center font-medium">Epworth</th>
            <th className="px-3 py-2 text-center font-medium">Smell</th>
            <th className="px-3 py-2 text-center font-medium">TMSE</th>
            <th className="px-3 py-2 text-center font-medium">RBD</th>
            <th className="px-3 py-2 text-center font-medium">Rome4</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(({ patient: p, diag, conditionLabel, moca, hamd, mds, epw, smell, tmse, rbd, rome4 }) => (
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
              <td className="px-3 py-2 text-center" title={diag?.other_diagnosis_text ?? ''}>
                {diag?.other_diagnosis_text ?? '-'}
              </td>
              <td className="px-3 py-2 text-center">{moca?.total_score ?? '-'}</td>
              <td className="px-3 py-2 text-center">{hamd?.total_score ?? '-'}</td>
              <td className="px-3 py-2 text-center">{mds?.total_score ?? '-'}</td>
              <td className="px-3 py-2 text-center">{epw?.total_score ?? '-'}</td>
              <td className="px-3 py-2 text-center">{smell?.total_score ?? '-'}</td>
              <td className="px-3 py-2 text-center">{tmse?.total_score ?? '-'}</td>
              <td className="px-3 py-2 text-center">{rbd?.total_score ?? '-'}</td>
              <td className="px-3 py-2 text-center">{rome4?.total_score ?? '-'}</td>
              <td className="px-3 py-2 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => window.open(`/api/qa-pdf?patient_id=${p.id}`, '_blank')}
                      className="cursor-pointer text-green-700 focus:text-green-700"
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onAssess(p)}
                      className="cursor-pointer text-purple-700 focus:text-purple-700"
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Tests
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onEdit(p)}
                      className="cursor-pointer text-blue-700 focus:text-blue-700"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim())}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
