"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  Bell,
  Database,
  FileDown,
  ShieldCheck,
  Stethoscope,
  Users,
  Package,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import SidebarLayout from "@/app/component/layout/SidebarLayout"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSession } from "@/app/providers/SessionProvider"
import { useAccessProfile } from "@/app/hooks/useAccessProfile"
import { APP_ROLE_LABELS, canAccessFeature, type AppFeature } from "@/lib/access"

type MenuTile = {
  title: string
  subtitle: string
  icon: LucideIcon
  path: string
  feature: AppFeature
  tone: {
    iconBg: string
    iconColor: string
    accent: string
  }
}

const tiles: MenuTile[] = [
  {
    title: "Statistics Dashboard",
    subtitle: "ภาพรวมยอดดาวโหลด · ผลคัดกรอง · กราฟจังหวัด · อำเภอ จากข้อมูล CheckPD",
    icon: BarChart3,
    path: "/pages/dashboard",
    feature: "dashboard",
    tone: { iconBg: "bg-teal-50",    iconColor: "text-teal-700",    accent: "border-l-teal-500" },
  },
  {
    title: "Diagnosis Management",
    subtitle: "จัดการข้อมูลผู้ป่วยและประวัติการวินิจฉัยในระบบ CheckPD",
    icon: Users,
    path: "/pages/users",
    feature: "users",
    tone: { iconBg: "bg-sky-50",     iconColor: "text-sky-700",     accent: "border-l-sky-500" },
  },
  {
    title: "Screening Assessments",
    subtitle: "บันทึก ตรวจสอบ และประเมินแบบทดสอบ MOCA / HAMD / MDS-UPDRS และอื่นๆ",
    icon: ShieldCheck,
    path: "/pages/qa",
    feature: "qa",
    tone: { iconBg: "bg-indigo-50",  iconColor: "text-indigo-700",  accent: "border-l-indigo-500" },
  },
  {
    title: "Usage Analytics",
    subtitle: "ติดตามกิจกรรมและยอดดาวโหลดข้อมูลแบบเรียลไทม์",
    icon: Bell,
    path: "/pages/tracking",
    feature: "tracking",
    tone: { iconBg: "bg-amber-50",   iconColor: "text-amber-700",   accent: "border-l-amber-500" },
  },
  {
    title: "CheckPD Report Export (PDF)",
    subtitle: "ส่งออกผลการประเมินเป็น PDF สำหรับใช้กับเวชระเบียน",
    icon: FileDown,
    path: "/pages/pdf",
    feature: "pdf",
    tone: { iconBg: "bg-violet-50",  iconColor: "text-violet-700",  accent: "border-l-violet-500" },
  },
  {
    title: "Raw Data Access",
    subtitle: "ดาวโหลดไฟล์เซ็นเซอร์ดิบ เสียง การเคลื่อนไหวจาก S3 / Supabase Storage",
    icon: Package,
    path: "/pages/storage",
    feature: "storage",
    tone: { iconBg: "bg-emerald-50", iconColor: "text-emerald-700", accent: "border-l-emerald-500" },
  },
  {
    title: "User Management",
    subtitle: "จัดการบัญชีผู้ดูแลและสิทธิ์เข้าถึงระบบ",
    icon: ShieldCheck,
    path: "/pages/admin",
    feature: "admin",
    tone: { iconBg: "bg-rose-50",    iconColor: "text-rose-700",    accent: "border-l-rose-500" },
  },
  {
    title: "Activity Logs",
    subtitle: "ดูประวัติการเข้าใช้และการแก้ไขข้อมูลของผู้ดูแล",
    icon: Bell,
    path: "/pages/log",
    feature: "log",
    tone: { iconBg: "bg-slate-100",  iconColor: "text-slate-700",   accent: "border-l-slate-400" },
  },
]

export default function HomeMenuPage() {
  const router = useRouter()
  const { session } = useSession()
  const { accessProfile } = useAccessProfile(session)
  const [rawDataChooserOpen, setRawDataChooserOpen] = useState(false)

  // Guest mode lands on /pages/dashboard, not here. Middleware already redirects them.
  // Belt-and-suspenders: bounce on the client too in case middleware is stale.
  useEffect(() => {
    if (accessProfile.role === "guest") {
      router.replace("/pages/dashboard")
    }
  }, [accessProfile.role, router])

  const visibleTiles = useMemo(
    () => tiles.filter((t) => canAccessFeature(accessProfile.role, t.feature)),
    [accessProfile.role]
  )

  const userName = useMemo(() => {
    const metadata = session?.user?.user_metadata
    return metadata?.name || metadata?.full_name || session?.user?.email?.split("@")[0] || "Admin ChulaPD"
  }, [session])

  const roleLabel = accessProfile.role ? APP_ROLE_LABELS[accessProfile.role] : "ผู้ดูแลระบบ"

  return (
    <SidebarLayout activePath="/pages/index" mainClassName="bg-[#eef2ff] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Stethoscope className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">CheckPD · Operations Console</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">สวัสดี, {userName}</h1>
              <p className="mt-1 text-sm text-slate-500">เลือกโมดูลที่ต้องการเข้าใช้งานจากด้านล่าง</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {roleLabel}
            </span>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              โมดูลที่เปิดให้คุณเข้าถึง · {visibleTiles.length.toString().padStart(2, "0")} รายการ
            </h2>
          </div>

          {visibleTiles.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="text-sm text-slate-500">บัญชีของคุณยังไม่ได้รับสิทธิ์เข้าถึงโมดูลใด · ติดต่อผู้ดูแลระบบ</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleTiles.map((tile) => {
                const Icon = tile.icon
                return (
                  <button
                    key={tile.path}
                    onClick={() => {
                      if (tile.title === "Raw Data Access") {
                        setRawDataChooserOpen(true)
                        return
                      }
                      router.push(tile.path)
                    }}
                    className={`group flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] border-l-4 ${tile.tone.accent}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tile.tone.iconBg} ${tile.tone.iconColor}`}>
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{tile.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">{tile.subtitle}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <Dialog open={rawDataChooserOpen} onOpenChange={setRawDataChooserOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>เลือกระบบข้อมูลดิบ (Raw Data Access)</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push("/pages/export")}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-700 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Package className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Patient Records ZIP</p>
                    <p className="text-xs text-slate-500">JSON + WAV from Firestore export</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">ส่งออกข้อมูลราย record เป็น ZIP รูปแบบเดิม</p>
              </button>
              <button
                type="button"
                onClick={() => router.push("/pages/storage")}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-700 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Database className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Storage Files</p>
                    <p className="text-xs text-slate-500">Supabase Storage raw sensor files</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">ค้นหาและดาวน์โหลดไฟล์เซ็นเซอร์ดิบจาก storage</p>
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <footer className="mt-4 rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-4 text-xs text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="font-medium text-slate-700">Excellence Center for Parkinson&apos;s Disease</p>
          <p className="mt-0.5">King Chulalongkorn Memorial Hospital · ระบบบริหารจัดการข้อมูล CheckPD</p>
        </footer>
      </div>
    </SidebarLayout>
  )
}
