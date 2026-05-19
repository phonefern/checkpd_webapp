"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { type ChartDatum } from "./types"

export default function AmphoeBarChart({ data }: { data: ChartDatum[] }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="mb-2 text-xs font-semibold text-slate-500">อำเภอที่มีผู้คัดกรองสูงสุด</p>
      {data.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data} margin={{ left: 8, right: 12 }}>
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#0d9488" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
