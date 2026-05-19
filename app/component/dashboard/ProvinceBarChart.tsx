"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts"
import { MapPin } from "lucide-react"
import { type ChartDatum } from "./types"

const NO_PROVINCE_LABEL = "ไม่ระบุจังหวัด"

function normalizeProvinceLabel(name: string): string {
  const trimmed = name.trim()
  if (!trimmed || trimmed === "ไม่ระบุ" || trimmed === "ไม่ระบุจังหวัด") return NO_PROVINCE_LABEL
  return trimmed
}

export default function ProvinceBarChart({ data }: { data: ChartDatum[] }) {
  const normalized = data.map((d) => ({ ...d, name: normalizeProvinceLabel(d.name) }))
  const total = normalized.reduce((sum, d) => sum + d.count, 0)

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <MapPin className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">การกระจายตามจังหวัด</p>
            <p className="text-sm font-medium text-slate-800">จังหวัดที่มีผู้คัดกรองสูงสุด 15 อันดับ</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium tabular-nums text-slate-600">
          รวม {total.toLocaleString()} คน
        </span>
      </header>

      {normalized.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <MapPin className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
          <p className="text-sm text-slate-500">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
        </div>
      ) : (
        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={normalized} margin={{ top: 4, left: 8, right: 28, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={140}
                stroke="#94a3b8"
                tick={{ fontSize: 12, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(13, 148, 136, 0.06)" }}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
                  fontSize: 12,
                  padding: "8px 12px",
                }}
                labelStyle={{ color: "#0f172a", fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number) => [`${value.toLocaleString()} คน`, "จำนวน"]}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                {normalized.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.name === NO_PROVINCE_LABEL ? "#cbd5e1" : "#0d9488"}
                    fillOpacity={entry.name === NO_PROVINCE_LABEL ? 0.85 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
