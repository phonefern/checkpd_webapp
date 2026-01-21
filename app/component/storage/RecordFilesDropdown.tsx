'use client'

import { useEffect, useState } from 'react'
import { FolderDown } from 'lucide-react'

type FileItem = {
  name: string
  size: number
}

type Props = {
  userId: string
  recordId: string
}

export default function RecordFileDropdown({
  userId,
  recordId,
}: Props) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [downloaded, setDownloaded] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true)
      const res = await fetch(
        `/api/storage/list-files?user_id=${userId}&record_id=${recordId}`
      )
      const json = await res.json()
      setFiles(json ?? [])
      setLoading(false)
    }

    fetchFiles()
  }, [userId, recordId])

  const onDownload = (file: string) => {
    window.open(
      `/api/storage/download-file?user_id=${userId}&record_id=${recordId}&file=${file}`,
      '_blank'
    )

    setDownloaded(prev =>
      prev.includes(file) ? prev : [...prev, file]
    )
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3 w-full px-30 md:px-30 py-6 ">

      {/* Header */}
      <div className="font-semibold text-gray-800">
        ไฟล์ทั้งหมดของ {recordId}
      </div>

      {loading && (
        <div className="text-sm text-gray-400">Dowloading...</div>
      )}

      {!loading && files.length === 0 && (
        <div className="text-sm text-gray-400">ไม่พบไฟล์</div>
      )}

      {!loading &&
        files.map(f => {
          const isDownloaded = downloaded.includes(f.name)

          return (
            <div
              key={f.name}
              className="flex items-center justify-between bg-white border rounded px-4 py-2"
            >
              <div>
                <div className="font-mono text-sm">{f.name}</div>
                <div className="text-xs text-gray-500">
                  {(f.size / 1024).toFixed(2)} KB
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`text-xs font-semibold ${isDownloaded
                    ? 'text-green-700'
                    : 'text-gray-400'
                    }`}
                >
                  {isDownloaded ? 'Downloaded' : 'Un-downloaded'}
                </span>

                <button
                  onClick={() => onDownload(f.name)}
                  className="flex items-center gap-1 text-purple-700 hover:underline"
                >
                  <FolderDown size={16} />
                  Download
                </button>
              </div>
            </div>
          )
        })}
    </div>
  )
}
