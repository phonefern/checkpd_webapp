"use client"

import { CalendarRange, MapPin, Map, ShieldCheck, RotateCcw } from "lucide-react"
import { type DashboardFilters, type RiskFilter } from "./types"

type Props = {
  filters: DashboardFilters
  provinces: string[]
  areas: string[]
  onChange: (next: DashboardFilters) => void
  onReset: () => void
}

const riskOptions: Array<{ label: string; value: RiskFilter }> = [
  { label: "ทั้งหมด",     value: "all" },
  { label: "กลุ่มเสี่ยง",  value: "risk" },
  { label: "ไม่เสี่ยง",   value: "no_risk" },
  { label: "ไม่ทราบผล",  value: "unknown" },
]

const fieldBase =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"

export default function DashboardFiltersBar({ filters, provinces, areas, onChange, onReset }: Props) {
  const hasActive =
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.province) ||
    Boolean(filters.area) ||
    filters.risk !== "all"

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">ตัวกรองข้อมูล</p>
        <button
          onClick={onReset}
          disabled={!hasActive}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" strokeWidth={2} />
          ล้างตัวกรอง
          {hasActive ? <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-teal-500" /> : null}
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-5 md:grid-cols-3">
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <CalendarRange className="h-3 w-3" strokeWidth={2} />
            ตั้งแต่วันที่
          </label>
          <input
            type="date"
            value={filters.startDate ?? ""}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value || null })}
            className={fieldBase}
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <CalendarRange className="h-3 w-3" strokeWidth={2} />
            ถึงวันที่
          </label>
          <input
            type="date"
            value={filters.endDate ?? ""}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value || null })}
            className={fieldBase}
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <MapPin className="h-3 w-3" strokeWidth={2} />
            จังหวัด
          </label>
          <select
            value={filters.province ?? ""}
            onChange={(e) => onChange({ ...filters, province: e.target.value || null, area: null })}
            className={fieldBase}
          >
            <option value="">ทุกจังหวัด</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <Map className="h-3 w-3" strokeWidth={2} />
            อำเภอ / พื้นที่
          </label>
          <select
            value={filters.area ?? ""}
            onChange={(e) => onChange({ ...filters, area: e.target.value || null })}
            className={fieldBase}
          >
            <option value="">ทุกพื้นที่</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <ShieldCheck className="h-3 w-3" strokeWidth={2} />
            ผลคัดกรอง
          </label>
          <select
            value={filters.risk}
            onChange={(e) => onChange({ ...filters, risk: e.target.value as RiskFilter })}
            className={fieldBase}
          >
            {riskOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

      </div>
    </section>
  )
}
