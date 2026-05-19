"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { type KpiMetrics } from "./types"

type Props = {
  kpis: KpiMetrics
  riskFilter: "all" | "risk" | "no_risk" | "unknown"
}

const COLORS = ["#ef4444", "#10b981", "#f59e0b"]

export default function RiskPieChart({ kpis, riskFilter }: Props) {
  const data = [
    { name: "กลุ่มเสี่ยง", value: kpis.risk },
    { name: "ไม่เสี่ยง", value: kpis.noRisk },
    { name: "ไม่ทราบผล", value: kpis.unknown },
  ]
  const filtered = riskFilter !== "all"
  return (
    <div className="relative rounded-xl border bg-white p-3">
      <p className="mb-2 text-xs font-semibold text-slate-500">สัดส่วนความเสี่ยง</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={90}>
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {filtered && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-white/55 text-sm font-medium text-slate-700">
          แสดงเฉพาะ: {riskFilter === "risk" ? "กลุ่มเสี่ยง" : riskFilter === "no_risk" ? "ไม่เสี่ยง" : "ไม่ทราบผล"}
        </div>
      )}
    </div>
  )
}
