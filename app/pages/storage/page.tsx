// app/pages/storage/page.tsx
import StorageClient from './storageClient'

export default function StoragePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      {/* ===== Header Section ===== */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-2">

          <h1 className="text-4xl font-bold text-gray-900">
            File Storage Management
          </h1>

          <p className="text-lg text-gray-600">
            ดาวน์โหลดข้อมูลผู้ป่วยจาก CheckPD Application
          </p>

          <p className="text-lg text-gray-600">
            แบบทดสอบ Voice (Sustained Phonation and Sentence) / Rest Tremor / Postural Tremor / Dual Tap / Pinch to Size / Gait (Walk) / Balance / Risk Questionnaire
          </p>

        </div>
      </div>

      {/* ===== Content Section ===== */}
      <div className="w-full px-10 md:px-60 py-6">
        <StorageClient />
      </div>

      {/* ===== Footer Section (RESPONSIVE & STABLE) ===== */}
      <footer className="bg-slate-50 py-10">
        <div className="max-w-6xl mx-auto px-6 text-center">

          {/* Top dashed divider */}
          <div className="border-t border-dashed-bold border-gray-900 mb-6" />

          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Information about dualtap and pinchtosize files (JSON)
          </h2>

          <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
            <p>
              1. For data collected <strong>before November 30th, 2024</strong>,
              <code className="px-1">dualtap</code> and
              <code className="px-1">pinchtosize</code> each have only one file,
              which corresponds to the right hand only.
            </p>

            <p>
              2. For data collected <strong>after November 30th, 2024</strong>,
              <code className="px-1">dualtap</code> and
              <code className="px-1">pinchtosize</code> are separated into two files per test:
            </p>

            <p>– <code>dualtap</code> for the left hand and <code>dualtapright</code> for the right hand</p>
            <p>– <code>pinchtosize</code> for the left hand and <code>pinchtosizeright</code> for the right hand</p>
          </div>

          {/* Bottom dashed divider */}
          <div className="border-t border-dashed-bold border-gray-900 mt-6" />

        </div>
      </footer>
    </div>
  )
}