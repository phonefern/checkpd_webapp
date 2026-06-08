// app/pages/storage/page.tsx
import SidebarLayout from '@/app/component/layout/SidebarLayout'
import StorageClient from './storageClient'

export default function StoragePage() {
  return (
    <SidebarLayout activePath="/pages/storage" mainClassName="bg-slate-50">
      <div className="min-h-screen">
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl space-y-2 px-6 py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Raw Data Access</p>
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

        <div className="w-full px-6 py-6 lg:px-16 xl:px-32">
          <StorageClient />
        </div>

        <footer className="bg-slate-50 py-10">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <div className="mb-6 border-t border-dashed border-gray-900" />
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Information about dualtap and pinchtosize files (JSON)
            </h2>
            <div className="space-y-2 text-sm leading-relaxed text-gray-600">
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
              <p>- <code>dualtap</code> for the left hand and <code>dualtapright</code> for the right hand</p>
              <p>- <code>pinchtosize</code> for the left hand and <code>pinchtosizeright</code> for the right hand</p>
            </div>
            <div className="mt-6 border-t border-dashed border-gray-900" />
          </div>
        </footer>
      </div>
    </SidebarLayout>
  )
}
