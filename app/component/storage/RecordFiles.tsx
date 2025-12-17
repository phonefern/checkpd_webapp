"use client"

// app/pages/component/RecordFiles.tsx
// display recordfile (record_id) each users


import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FileInfo } from './types';

type Props = {
  patientId: string
  recordId: string
}

export default function RecordFiles({ patientId, recordId }: Props) {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [recordId])

  async function loadFiles() {
    setLoading(true)

    const { data, error } = await supabase.storage
      .from('checkpd')
      .list(`${patientId}/${recordId}`)

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    // TODO: map with download_history
    const mapped: FileInfo[] =
      data?.map((f) => ({
        name: f.name,
        size: f.metadata?.size ?? 0,
        downloaded: false,
      })) ?? []

    setFiles(mapped)
    setLoading(false)
  }

  async function downloadFile(fileName: string) {
    const { data, error } = await supabase.storage
      .from('checkpd')
      .download(`${patientId}/${recordId}/${fileName}`)

    if (error) {
      console.error(error)
      return
    }

    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading files…</div>
  }

  return (
    <div className="border rounded-md p-4 mt-2 bg-gray-50">
      <div className="font-medium mb-2">
        ไฟล์ทั้งหมดของ {recordId}
      </div>

      <ul className="space-y-2">
        {files.map((file) => (
          <li
            key={file.name}
            className="flex justify-between items-center border-b pb-1"
          >
            <div>
              <div className="text-sm">{file.name}</div>
              <div className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs ${
                  file.downloaded
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                {file.downloaded ? 'Downloaded' : 'Un-downloaded'}
              </span>

              <button
                onClick={() => downloadFile(file.name)}
                className="text-blue-600 text-sm"
              >
                download
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
