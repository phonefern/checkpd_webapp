'use client'

import TqdmSpinner from '@/app/component/dashboard/TqdmSpinner'

type Props = {
  open: boolean
  progress?: { current: number; total: number }
}

/**
 * Full-viewport overlay shown while the storage ZIP is being assembled client-side.
 * Mirrors the export page's ExportProgressOverlay so both Raw Data Access surfaces
 * share the same blocking-download UX.
 */
export default function StorageDownloadOverlay({ open, progress }: Props) {
  if (!open) return null

  const hasProgress = Boolean(progress && progress.total > 0)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <TqdmSpinner
        label="กำลังเตรียมไฟล์ ZIP สำหรับดาวน์โหลด"
        detail={
          hasProgress
            ? `กำลังดาวน์โหลด ${progress!.current.toLocaleString()} / ${progress!.total.toLocaleString()} ไฟล์ — กรุณาอย่าปิดหน้านี้`
            : 'กำลังรวบรวมรายการไฟล์ — กรุณาอย่าปิดหน้านี้จนกว่าจะดาวน์โหลดเสร็จ'
        }
      />
    </div>
  )
}
