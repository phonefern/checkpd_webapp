"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { ClipboardCheck } from "lucide-react"

type Props = {
  counts: {
    complete: number
    partial?: number
    incomplete?: number
    unattempt: number
  }
}

const SEGMENTS = [
  { key: "complete",  label: "ทำแบบทดสอบครบ",     color: "#0d9488" },
  { key: "partial",   label: "ทำแบบทดสอบบางส่วน", color: "#f59e0b" },
  { key: "unattempt", label: "ไม่ได้ทำแบบทดสอบ",   color: "#cbd5e1" },
] as const

export default function TestResultPieChart({ counts }: Props) {
  const partial = counts.partial ?? counts.incomplete ?? 0
  const values: Record<typeof SEGMENTS[number]["key"], number> = {
    complete: counts.complete,
    partial,
    unattempt: counts.unattempt,
  }
  const total = values.complete + values.partial + values.unattempt
  const data = SEGMENTS.map((s) => ({ name: s.label, value: values[s.key], color: s.color }))

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <ClipboardCheck className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">สัดส่วนแบบทดสอบ</p>
          <p className="text-sm font-medium text-slate-800">ความครบถ้วนของการทำแบบทดสอบ</p>
        </div>
      </header>

      <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
        <div className="relative h-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={2} stroke="none">
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
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
            <span className="text-2xl font-semibold tabular-nums text-slate-900">{total.toLocaleString()}</span>
          </div>
        </div>

        <ul className="space-y-2.5 text-sm">
          {data.map((entry) => {
            const pct = total > 0 ? (entry.value / total) * 100 : 0
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
  )
}
