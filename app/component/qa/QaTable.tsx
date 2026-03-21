'use client'

import { QaRow, QA_CONDITION_OPTIONS, QA_HY_OPTIONS } from './types'
import { provinceOptions } from '@/app/types/user'
import { Button } from '@/components/ui/button'
import { Pencil, Check, X } from 'lucide-react'

interface QaTableProps {
  rows: QaRow[]
  editingId: number | null
  setEditingId: (id: number | null) => void
  onFieldChange: (patientId: number, field: string, value: string) => void
  onSave: (patientId: number) => void
}

export default function QaTable({ rows, editingId, setEditingId, onFieldChange, onSave }: QaTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground border rounded p-6 text-center">
        No records found for the selected filters
      </div>
    )
  }

  const conditionEditOptions = QA_CONDITION_OPTIONS.filter((o) => o.value !== '')

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
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(({ patient: p, diag, conditionLabel, moca, hamd, mds, epw, smell }) => {
            const isEditing = editingId === p.id
            return (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.id}</td>
                <td className="px-3 py-2 whitespace-nowrap">{p.first_name} {p.last_name}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.hn_number ?? '-'}</td>
                <td className="px-3 py-2 text-center">{p.age ?? '-'}</td>
                <td className="px-3 py-2">
                  {isEditing ? (
                    <select
                      value={p.province ?? ''}
                      onChange={(e) => onFieldChange(p.id, 'province', e.target.value)}
                      className="border border-gray-300 rounded p-1 text-sm w-36 cursor-pointer"
                    >
                      <option value="">-</option>
                      {provinceOptions.filter((o) => o.value !== 'null').map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    p.province ?? '-'
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs">{p.collection_date ?? '-'}</td>
                <td className="px-3 py-2 text-center">{p.bmi != null ? Number(p.bmi).toFixed(1) : '-'}</td>
                <td className="px-3 py-2">
                  {isEditing ? (
                    <select
                      value={diag?.condition ?? ''}
                      onChange={(e) => onFieldChange(p.id, 'condition', e.target.value)}
                      className="border border-gray-300 rounded p-1 text-sm cursor-pointer"
                    >
                      <option value="">-</option>
                      {conditionEditOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    conditionLabel
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {isEditing ? (
                    <select
                      value={diag?.hy_stage ?? ''}
                      onChange={(e) => onFieldChange(p.id, 'hy_stage', e.target.value)}
                      className="border border-gray-300 rounded p-1 text-sm w-16 cursor-pointer"
                    >
                      {QA_HY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    diag?.hy_stage ?? '-'
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {isEditing ? (
                    <input
                      type="text"
                      value={diag?.disease_duration ?? ''}
                      onChange={(e) => onFieldChange(p.id, 'disease_duration', e.target.value)}
                      className="border border-gray-300 rounded p-1 text-sm w-24"
                    />
                  ) : (
                    diag?.disease_duration ?? '-'
                  )}
                </td>
                <td className="px-3 py-2 text-xs max-w-[160px] truncate" title={diag?.other_diagnosis_text ?? ''}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={diag?.other_diagnosis_text ?? ''}
                      onChange={(e) => onFieldChange(p.id, 'other_diagnosis_text', e.target.value)}
                      className="border border-gray-300 rounded p-1 text-sm w-36"
                    />
                  ) : (
                    diag?.other_diagnosis_text ?? '-'
                  )}
                </td>
                <td className="px-3 py-2 text-center">{moca?.total_score ?? '-'}</td>
                <td className="px-3 py-2 text-center">{hamd?.total_score ?? '-'}</td>
                <td className="px-3 py-2 text-center">{mds?.total_score ?? '-'}</td>
                <td className="px-3 py-2 text-center">{epw?.total_score ?? '-'}</td>
                <td className="px-3 py-2 text-center">{smell?.total_score ?? '-'}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        onClick={() => onSave(p.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        <Check className="mr-1 h-3 w-3" />Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="cursor-pointer">
                        <X className="mr-1 h-3 w-3" />Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(p.id)}
                      className="border-blue-600 text-blue-700 hover:bg-blue-50 cursor-pointer"
                    >
                      <Pencil className="mr-1 h-3 w-3" />Edit
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
