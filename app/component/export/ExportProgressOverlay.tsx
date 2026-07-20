'use client'

import TqdmSpinner from '@/app/component/dashboard/TqdmSpinner'

type Props = {
  open: boolean
  count?: number
}

/**
 * Full-viewport, always-centered overlay shown while a ZIP export is being built.
 * Fixed positioning keeps the spinner in the middle of the user's screen regardless
 * of how far the records table is scrolled.
 */
export default function ExportProgressOverlay({ open, count }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <TqdmSpinner
        label="กำลังเตรียมไฟล์ ZIP สำหรับดาวน์โหลด"
        detail={
          count && count > 0
            ? `กำลังรวบรวม ${count.toLocaleString()} รายการ (JSON + ไฟล์เสียง) — กรุณาอย่าปิดหน้านี้`
            : 'กรุณาอย่าปิดหน้านี้จนกว่าจะดาวน์โหลดเสร็จ'
        }
      />
    </div>
  )
}
