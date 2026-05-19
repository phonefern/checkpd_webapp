"use client"

import { useEffect, useState } from "react"

type Props = {
  label?: string
  detail?: string
}

export default function TqdmSpinner({ label = "กำลังโหลดข้อมูล", detail }: Props) {
  const [pct, setPct] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const tick = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000)
      setPct((prev) => {
        const remaining = 95 - prev
        if (remaining <= 0) return prev
        return prev + remaining * 0.06
      })
    }, 120)
    return () => clearInterval(tick)
  }, [])

  const blocks = 24
  const filled = Math.min(blocks, Math.round((pct / 100) * blocks))
  const rate = elapsed > 0 ? (pct / elapsed).toFixed(1) : "0.0"

  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200/70 bg-white/80 px-8 py-12 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm">
      <div className="relative h-14 w-14">
        <svg className="h-full w-full -rotate-90 animate-spin" viewBox="0 0 50 50" style={{ animationDuration: "1.2s" }}>
          <circle cx="25" cy="25" r="20" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="#0d9488"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="125.6"
            strokeDashoffset="90"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-medium tabular-nums text-slate-500">
          {Math.round(pct)}%
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums text-slate-500">
          <span className="text-teal-700">{Math.round(pct).toString().padStart(2, " ")}%</span>
          <span className="text-slate-400">|</span>
          <span className="tracking-tighter">
            <span className="text-teal-600">{"█".repeat(filled)}</span>
            <span className="text-slate-200">{"░".repeat(blocks - filled)}</span>
          </span>
          <span className="text-slate-400">|</span>
          <span>
            [{elapsed.toFixed(1)}s, {rate}it/s]
          </span>
        </div>
        {detail ? <p className="text-xs text-slate-400">{detail}</p> : null}
      </div>
    </div>
  )
}
