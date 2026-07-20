'use client'

type Props = {
  error: string
  success: string
}

export default function ExportToolbar({ error, success }: Props) {
  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Raw Data Access</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Export Patient Records</h1>
        <p className="mt-1 text-sm text-slate-500">Firestore JSON + WAV export ZIP</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}
    </>
  )
}
