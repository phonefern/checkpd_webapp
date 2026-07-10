"use client"

import { useEffect, useMemo, useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"
import {
  Activity, ShieldAlert, ShieldCheck, Clock, CircleSlash,
  Download, Stethoscope, Users, UserRound, BarChart3,
  AlertTriangle,
} from "lucide-react"
import SidebarLayout from "@/app/component/layout/SidebarLayout"
import { supabase } from "@/lib/supabase"
import { signOutEverywhere } from "@/lib/auth"
import DashboardFilters from "@/app/component/dashboard/DashboardFilters"
import ProvinceBarChart from "@/app/component/dashboard/ProvinceBarChart"
import TestResultPieChart from "@/app/component/dashboard/TestResultPieChart"
import TqdmSpinner from "@/app/component/dashboard/TqdmSpinner"
import {
  DEFAULT_FILTERS,
  type DashboardFilters as DashboardFiltersType,
  type DashboardStatsPayload,
} from "@/app/component/dashboard/types"
import { useSession } from "@/app/providers/SessionProvider"
import { useAccessProfile } from "@/app/hooks/useAccessProfile"

const RISK_PIE_COLORS = {
  risk:    "#e11d48",
  normal:  "#0d9488",
  pending: "#94a3b8",
  noTest:  "#f59e0b",
}

async function fetchDashboardStats(filters: DashboardFiltersType): Promise<DashboardStatsPayload> {
  const params = new URLSearchParams()
  if (filters.startDate) params.set("start", filters.startDate)
  if (filters.endDate) params.set("end", filters.endDate)
  if (filters.province) params.set("province", filters.province)
  if (filters.area) params.set("area", filters.area)
  if (filters.risk) params.set("risk", filters.risk)

  const query = params.toString()
  const response = await fetch(`/api/dashboard/stats${query ? `?${query}` : ""}`, {
    credentials: "same-origin",
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.error ?? "Dashboard stats request failed")
  }
  return body as DashboardStatsPayload
}

type RiskKpi = {
  label: string
  value: number
  description: string
  icon: typeof ShieldAlert
  tone: {
    iconBg: string
    iconColor: string
    accent: string
    valueColor: string
  }
}

export default function DashboardStatsPage() {
  const { session } = useSession()
  const { accessProfile } = useAccessProfile(session)
  const isGuest = accessProfile.role === "guest"
  const [filters, setFilters] = useState<DashboardFiltersType>(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [provinceOptions, setProvinceOptions] = useState<string[]>([])
  const [areaOptions, setAreaOptions] = useState<string[]>([])
  const [downloadCount, setDownloadCount] = useState(0)

  const [riskCounts, setRiskCounts] = useState({ risk: 0, normal: 0, pending: 0, noTest: 0 })
  const [testResultCounts, setTestResultCounts] = useState({ complete: 0, partial: 0, unattempt: 0 })
  const [conditionCounts, setConditionCounts] = useState({ pd: 0, pdm: 0, ctrl: 0, other: 0 })
  const [genderCounts, setGenderCounts] = useState({ male: 0, female: 0, other: 0 })
  const [ageBuckets, setAgeBuckets] = useState<Array<{ label: string; count: number }>>([])
  const [provinceData, setProvinceData] = useState<Array<{ name: string; count: number }>>([])

  const handleGuestLoginRedirect = async () => {
    try {
      await signOutEverywhere(supabase)
    } finally {
      window.location.href = "/pages/login"
    }
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const stats = await fetchDashboardStats(filters)

        if (cancelled) return
        setProvinceOptions(stats.province_options)
        setAreaOptions(stats.area_options)
        setDownloadCount(stats.download_count)
        setRiskCounts(stats.risk_counts)
        setTestResultCounts(stats.test_result_counts)
        setConditionCounts(stats.condition_counts)
        setGenderCounts(stats.gender_counts)
        setAgeBuckets(stats.age_buckets)
        setProvinceData(stats.province_top)
        const generatedAt = new Date(stats.generated_at)
        setLastUpdated(Number.isNaN(generatedAt.getTime()) ? new Date() : generatedAt)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [filters])

  const totalScreened = riskCounts.risk + riskCounts.normal + riskCounts.pending + riskCounts.noTest

  const riskKpis: RiskKpi[] = useMemo(() => [
    {
      label: "เสี่ยง",
      value: riskCounts.risk,
      description: "พบความเสี่ยงจากการประเมินล่าสุด",
      icon: ShieldAlert,
      tone: { iconBg: "bg-rose-50",    iconColor: "text-rose-600",    accent: "border-l-rose-400",    valueColor: "text-rose-600" },
    },
    {
      label: "ปกติ",
      value: riskCounts.normal,
      description: "ไม่พบความเสี่ยง",
      icon: ShieldCheck,
      tone: { iconBg: "bg-teal-50",    iconColor: "text-teal-700",    accent: "border-l-teal-500",    valueColor: "text-teal-700" },
    },
    {
      label: "ยังไม่ประเมิน",
      value: riskCounts.pending,
      description: "ทำแบบทดสอบแล้ว แต่ยังไม่มีผล",
      icon: Clock,
      tone: { iconBg: "bg-slate-100",  iconColor: "text-slate-600",   accent: "border-l-slate-300",   valueColor: "text-slate-700" },
    },
    {
      label: "ไม่ได้ทดสอบ",
      value: riskCounts.noTest,
      description: "ยังไม่มีบันทึกการทดสอบ",
      icon: CircleSlash,
      tone: { iconBg: "bg-amber-50",   iconColor: "text-amber-600",   accent: "border-l-amber-400",   valueColor: "text-amber-700" },
    },
  ], [riskCounts])

  const riskPie = useMemo(() => [
    { name: "เสี่ยง",         value: riskCounts.risk,    color: RISK_PIE_COLORS.risk },
    { name: "ปกติ",          value: riskCounts.normal,  color: RISK_PIE_COLORS.normal },
    { name: "ยังไม่ประเมิน",   value: riskCounts.pending, color: RISK_PIE_COLORS.pending },
    { name: "ไม่ได้ทดสอบ",    value: riskCounts.noTest,  color: RISK_PIE_COLORS.noTest },
  ], [riskCounts])

  const totalRiskPie = riskPie.reduce((s, x) => s + x.value, 0)
  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—"

  return (
    <SidebarLayout activePath="/pages/dashboard" mainClassName="bg-[#eef2ff] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Stethoscope className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">CheckPD · Clinical Dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">แดชบอร์ดภาพรวมการคัดกรอง</h1>
              <p className="mt-1 text-sm text-slate-500">ภาพรวมผลคัดกรองโรคพาร์กินสันจากผู้ใช้งานแอป CheckPD</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
              <span className={`h-1.5 w-1.5 rounded-full ${loading ? "animate-pulse bg-teal-500" : "bg-emerald-500"}`} />
              อัปเดตล่าสุด · {lastUpdatedLabel}
            </span>
          </div>
        </header>
        {isGuest ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">คุณกำลังดูในโหมดผู้เยี่ยมชม</p>
              <p className="mt-0.5 text-amber-800/80">เห็นเฉพาะภาพรวมแบบรวมยอด · ไม่สามารถเข้าถึงข้อมูลผู้ป่วยรายบุคคลได้</p>
            </div>
            <button
              onClick={handleGuestLoginRedirect}
              className="ml-auto rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              เข้าสู่ระบบ
            </button>
          </div>
        ) : null}

        <DashboardFilters
          filters={filters}
          provinces={provinceOptions}
          areas={areaOptions}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />

        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2} />
            <div>
              <p className="font-medium">โหลดข้อมูลไม่สำเร็จ</p>
              <p className="mt-0.5 text-rose-700/90">{error}</p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <TqdmSpinner label="กำลังโหลดข้อมูลแดชบอร์ด" detail="ดึงข้อมูลผู้ใช้และผลคัดกรองจาก CheckPD" />
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-500" strokeWidth={2} />
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  ผลการคัดกรอง · จากการทดสอบล่าสุด
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {riskKpis.map((kpi) => {
                  const pct = totalScreened > 0 ? (kpi.value / totalScreened) * 100 : 0
                  const Icon = kpi.icon
                  return (
                    <article
                      key={kpi.label}
                      className={`group rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] border-l-4 ${kpi.tone.accent}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600">{kpi.label}</p>
                          <p className={`mt-2 text-4xl font-semibold tabular-nums tracking-tight ${kpi.tone.valueColor}`}>
                            {kpi.value.toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            <span className="tabular-nums">{pct.toFixed(1)}%</span>
                            <span className="mx-1 text-slate-300">·</span>
                            {kpi.description}
                          </p>
                        </div>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.tone.iconBg} ${kpi.tone.iconColor}`}>
                          <Icon className="h-5 w-5" strokeWidth={1.75} />
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-sky-50/50 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-8 lg:p-10">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                <div className="flex items-start gap-3 sm:items-center">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 sm:h-12 sm:w-12">
                    <Download className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-xs">
                    ยอดดาวโหลดสะสมทั้งหมด
                  </p>
                </div>
                <div className="flex w-full items-baseline justify-start gap-3 sm:w-auto sm:justify-end">
                  <p className="font-bold leading-none tabular-nums tracking-tight text-sky-800 text-[clamp(3rem,11vw,8rem)]">
                    {downloadCount.toLocaleString()}
                  </p>
                  <p className="text-base font-medium text-slate-500 sm:text-lg">ราย</p>
                </div>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <header className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                    <BarChart3 className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">สัดส่วนผลคัดกรอง</p>
                    <p className="text-sm font-medium text-slate-800">การกระจายของผลประเมินความเสี่ยง</p>
                  </div>
                </header>

                <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
                  <div className="relative h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={riskPie} dataKey="value" nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={2} stroke="none">
                          {riskPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
                            fontSize: 12,
                            padding: "8px 12px",
                          }}
                          formatter={(value: number, name: string) => [`${value.toLocaleString()} คน`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">ทั้งหมด</span>
                      <span className="text-2xl font-semibold tabular-nums text-slate-900">{totalRiskPie.toLocaleString()}</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-sm">
                    {riskPie.map((entry) => {
                      const pct = totalRiskPie > 0 ? (entry.value / totalRiskPie) * 100 : 0
                      return (
                        <li key={entry.name} className="flex items-center justify-between gap-4 min-w-[180px]">
                          <span className="flex items-center gap-2 text-slate-700">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name}
                          </span>
                          <span className="tabular-nums text-slate-500">
                            <span className="font-medium text-slate-900">{entry.value.toLocaleString()}</span>
                            <span className="ml-1.5 text-xs text-slate-400">{pct.toFixed(1)}%</span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </section>

              <TestResultPieChart counts={testResultCounts} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <header className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Stethoscope className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Condition</p>
                    <p className="text-sm font-medium text-slate-800">การวินิจฉัย</p>
                  </div>
                </header>
                {(() => {
                  const data = [
                    { name: "PD",    value: conditionCounts.pd,    color: "#e11d48" },
                    { name: "PDM",   value: conditionCounts.pdm,   color: "#f59e0b" },
                    { name: "CTRL",  value: conditionCounts.ctrl,  color: "#0d9488" },
                    { name: "Other", value: conditionCounts.other, color: "#94a3b8" },
                  ]
                  return (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 32, left: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                          <YAxis dataKey="name" type="category" width={56} stroke="#94a3b8" tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{ fill: "rgba(99, 102, 241, 0.06)" }}
                            contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,23,42,0.08)", fontSize: 12, padding: "8px 12px" }}
                            labelStyle={{ color: "#0f172a", fontWeight: 600, marginBottom: 4 }}
                            formatter={(value: number) => [`${value.toLocaleString()} คน`, "จำนวน"]}
                          />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                            {data.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })()}
              </section>

              <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <header className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                    <Users className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Gender</p>
                    <p className="text-sm font-medium text-slate-800">เพศ</p>
                  </div>
                </header>
                {(() => {
                  const data = [
                    { name: "ชาย",   value: genderCounts.male,   color: "#3b82f6" },
                    { name: "หญิง",  value: genderCounts.female, color: "#ec4899" },
                    { name: "อื่นๆ", value: genderCounts.other,  color: "#94a3b8" },
                  ]
                  const total = data.reduce((s, x) => s + x.value, 0)
                  return (
                    <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto]">
                      <div className="relative h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={2} stroke="none">
                              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,23,42,0.08)", fontSize: 12, padding: "8px 12px" }}
                              formatter={(value: number, name: string) => {
                                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0"
                                return [`${value.toLocaleString()} คน · ${pct}%`, name]
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">รวม</span>
                          <span className="text-lg font-semibold tabular-nums text-slate-900">{total.toLocaleString()}</span>
                        </div>
                      </div>
                      <ul className="space-y-2 text-xs">
                        {data.map((entry) => {
                          const pct = total > 0 ? (entry.value / total) * 100 : 0
                          return (
                            <li key={entry.name} className="flex items-center justify-between gap-3 min-w-[130px]">
                              <span className="flex items-center gap-1.5 text-slate-700">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                {entry.name}
                              </span>
                              <span className="tabular-nums">
                                <span className="font-semibold text-slate-900">{entry.value.toLocaleString()}</span>
                                <span className="ml-1.5 text-[11px] text-slate-400">{pct.toFixed(1)}%</span>
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })()}
              </section>

              <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-1">
                <header className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <UserRound className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">ช่วงอายุ</p>
                    <p className="text-sm font-medium text-slate-800">การกระจายตามวัย</p>
                  </div>
                </header>
                <ul className="space-y-1.5">
                  {(() => {
                    const max = Math.max(1, ...ageBuckets.map((b) => b.count))
                    return ageBuckets.map((b) => {
                      const pct = (b.count / max) * 100
                      const isUnknown = b.label === "ไม่ระบุ"
                      return (
                        <li key={b.label} className="grid grid-cols-[60px_1fr_56px] items-center gap-2 text-xs">
                          <span className={`tabular-nums ${isUnknown ? "text-slate-400" : "text-slate-600"}`}>{b.label}</span>
                          <span className="relative h-2 overflow-hidden rounded-full bg-slate-100">
                            <span
                              className={`absolute inset-y-0 left-0 rounded-full ${isUnknown ? "bg-slate-300" : "bg-teal-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="text-right font-semibold tabular-nums text-slate-900">{b.count.toLocaleString()}</span>
                        </li>
                      )
                    })
                  })()}
                </ul>
              </section>
            </div>

            <ProvinceBarChart data={provinceData} />
          </>
        )}
      </div>
    </SidebarLayout>
  )
}
