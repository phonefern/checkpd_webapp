'use client'

import { useRef, useState } from 'react'
import { FileUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  exportLoading: boolean
  /** Receives the de-duplicated list of user_ids parsed from the CSV. */
  onExport: (userIds: string[]) => void
}

/**
 * Parse a CSV that contains a `user_id` column (header match is case-insensitive;
 * falls back to the first column when no header is recognised). Returns the unique,
 * non-empty values. Handles a UTF-8 BOM and simple quoted cells.
 */
function parseUserIds(text: string): string[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length === 0) return []

  const clean = (cell: string) => cell.trim().replace(/^"(.*)"$/, '$1').trim()
  const header = lines[0].split(',').map((cell) => clean(cell).toLowerCase())

  let columnIndex = header.findIndex((cell) => cell === 'user_id' || cell === 'userid' || cell === 'user id')
  let dataLines: string[]
  if (columnIndex === -1) {
    // No recognised header — assume a single-column list of ids with no header row.
    columnIndex = 0
    dataLines = lines
  } else {
    dataLines = lines.slice(1)
  }

  const ids = new Set<string>()
  for (const line of dataLines) {
    const value = clean(line.split(',')[columnIndex] ?? '')
    if (value) ids.add(value)
  }
  return Array.from(ids)
}

export default function CsvUserIdImport({ exportLoading, onExport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [userIds, setUserIds] = useState<string[]>([])
  const [parseError, setParseError] = useState('')

  const handleFile = async (file: File) => {
    setParseError('')
    try {
      const text = await file.text()
      const ids = parseUserIds(text)
      if (ids.length === 0) {
        setParseError('ไม่พบ user_id ในไฟล์ — ตรวจสอบว่ามีคอลัมน์ชื่อ user_id')
        setUserIds([])
        setFileName(file.name)
        return
      }
      setUserIds(ids)
      setFileName(file.name)
    } catch {
      setParseError('อ่านไฟล์ไม่สำเร็จ')
      setUserIds([])
    }
  }

  const reset = () => {
    setFileName('')
    setUserIds([])
    setParseError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="mb-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-gray-900">ดึง Raw Data จากไฟล์ CSV (คอลัมน์ user_id)</h2>
        <p className="text-sm text-slate-600">
          อัปโหลด CSV ที่มีคอลัมน์ <code className="rounded bg-slate-200 px-1">user_id</code> ระบบจะดึง
          <strong> ทุก record_id</strong> ของแต่ละผู้ป่วยมารวมเป็นไฟล์ ZIP เดียว (เหมาะกับการดึงตาม demographic ที่ต้องการแบบครบถ้วน)
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={exportLoading}
          className="gap-2"
        >
          <FileUp className="h-4 w-4" />
          เลือกไฟล์ CSV
        </Button>

        {fileName && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span className="truncate font-medium">{fileName}</span>
            {userIds.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                พบ {userIds.length.toLocaleString()} user_id
              </span>
            )}
            <button onClick={reset} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600" title="ล้างไฟล์">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <Button
          onClick={() => onExport(userIds)}
          disabled={userIds.length === 0 || exportLoading}
          className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 sm:ml-auto"
        >
          {exportLoading ? 'กำลังดึง...' : `ดึง Raw Data (${userIds.length} user)`}
        </Button>
      </div>

      {parseError && <p className="mt-2 text-sm text-red-600">{parseError}</p>}
    </div>
  )
}
