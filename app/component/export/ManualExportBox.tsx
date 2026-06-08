'use client'

import { Button } from '@/components/ui/button'

type Props = {
  manualUserId: string
  setManualUserId: (value: string) => void
  manualRecordId: string
  setManualRecordId: (value: string) => void
  exportLoading: boolean
  manualExportLoading: boolean
  onManualExport: () => void
}

export default function ManualExportBox({
  manualUserId,
  setManualUserId,
  manualRecordId,
  setManualRecordId,
  exportLoading,
  manualExportLoading,
  onManualExport,
}: Props) {
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Manual user_id</label>
          <input
            type="text"
            value={manualUserId}
            onChange={(e) => setManualUserId(e.target.value)}
            placeholder="Enter Firebase user_id"
            className="w-full rounded-md border border-gray-300 p-2 focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Manual record_id</label>
          <input
            type="text"
            value={manualRecordId}
            onChange={(e) => setManualRecordId(e.target.value)}
            placeholder="Enter Firebase record_id"
            className="w-full rounded-md border border-gray-300 p-2 focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <Button
          onClick={onManualExport}
          disabled={!manualUserId.trim() || !manualRecordId.trim() || exportLoading || manualExportLoading}
          className="bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {manualExportLoading ? 'Exporting...' : 'Export Manual Record'}
        </Button>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Use this when the record exists in Firebase but is not visible in the table. Demographic CSV is added only when matching Supabase metadata exists.
      </p>
    </div>
  )
}
