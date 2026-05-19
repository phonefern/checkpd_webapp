"use client"

import { type KpiMetrics } from "./types"

type Props = {
  kpis: KpiMetrics
}

function pct(part: number, total: number): string {
  if (!total) return "0.0%"
  return `${((part / total) * 100).toFixed(1)}%`
}

function Card({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  )
}

export default function KpiCards({ kpis }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Card title="ผู้ถูกคัดกรองทั้งหมด" value={kpis.total.toLocaleString()} subtitle="นับจากผู้ใช้ไม่ซ้ำในบันทึกการคัดกรอง" />
      <Card title="กลุ่มเสี่ยง" value={kpis.risk.toLocaleString()} subtitle={pct(kpis.risk, kpis.total)} />
      <Card title="ไม่เสี่ยง" value={kpis.noRisk.toLocaleString()} subtitle={pct(kpis.noRisk, kpis.total)} />
      <Card title="รอผล / ไม่ทราบผล" value={kpis.unknown.toLocaleString()} subtitle={pct(kpis.unknown, kpis.total)} />
    </div>
  )
}
