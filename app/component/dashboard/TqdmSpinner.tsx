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

  const blocks = 18
  const filled = Math.min(blocks, Math.round((pct / 100) * blocks))

  return (
    <div className="relative flex w-[360px] flex-col items-center gap-5 overflow-hidden rounded-2xl border border-teal-100 bg-white/96 px-8 py-7 shadow-[0_8px_40px_rgba(13,148,136,0.18)] backdrop-blur-md">
      {/* Medical grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#0d9488 1px, transparent 1px), linear-gradient(90deg, #0d9488 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-2xl">
        <div
          className="h-full bg-gradient-to-r from-teal-400 via-teal-500 to-teal-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Sonar + rotating arc */}
      <div className="relative flex h-28 w-28 items-center justify-center">
        {/* Staggered sonar rings */}
        {([0, 1, 2] as const).map((i) => (
          <span
            key={i}
            className="absolute inset-0 rounded-full border border-teal-300 animate-ping"
            style={{ animationDuration: "2.6s", animationDelay: `${i * 0.8}s` }}
          />
        ))}

        {/* Static track */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r="52" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
        </svg>

        {/* Rotating scanner sweep */}
        <svg
          className="absolute inset-0 h-full w-full animate-spin"
          style={{ animationDuration: "2s" }}
          viewBox="0 0 112 112"
        >
          <defs>
            <linearGradient id="tqdm-sweep" gradientUnits="userSpaceOnUse" x1="112" y1="56" x2="56" y2="0">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <circle
            cx="56" cy="56" r="52"
            fill="none"
            stroke="url(#tqdm-sweep)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="327"
            strokeDashoffset="245"
          />
        </svg>

        {/* Inner pulse dot */}
        <div
          className="absolute h-2.5 w-2.5 rounded-full bg-teal-400 animate-ping"
          style={{ animationDuration: "1.5s" }}
        />

        {/* Center badge */}
        <div className="relative z-10 flex h-14 w-14 flex-col items-center justify-center rounded-full border border-teal-100 bg-gradient-to-br from-white to-teal-50 shadow-md">
          <span className="text-sm font-bold tabular-nums text-teal-700 leading-none">
            {Math.round(pct)}%
          </span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-widest text-teal-400">
            done
          </span>
        </div>
      </div>

      {/* Label + detail */}
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-semibold tracking-wide text-slate-700">{label}</p>
        {detail ? (
          <p className="text-[11px] text-slate-400 leading-relaxed">{detail}</p>
        ) : null}
      </div>

      {/* Progress bar */}
      <div className="w-full">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* EKG heartbeat line */}
      <div className="w-full overflow-hidden" style={{ filter: "drop-shadow(0 0 4px #0d948866)" }}>
        <svg viewBox="0 0 300 32" className="w-full">
          <path
            d="M 0,16 L 300,16"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <path
            className="tqdm-ekg"
            d="M 0,16 L 80,16 L 90,16 L 96,2 L 103,30 L 110,6 L 117,26 L 124,16 L 300,16"
            fill="none"
            stroke="#0d9488"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2.5 font-mono text-[11px] tabular-nums text-slate-400">
        <span className="font-bold text-teal-600">{Math.round(pct).toString().padStart(2, " ")}%</span>
        <span className="text-slate-200">│</span>
        <span>
          <span className="text-teal-500">{"█".repeat(filled)}</span>
          <span className="text-slate-200">{"░".repeat(blocks - filled)}</span>
        </span>
        <span className="text-slate-200">│</span>
        <span>{elapsed.toFixed(1)}s</span>
      </div>

      <style>{`
        .tqdm-ekg {
          stroke-dasharray: 500;
          stroke-dashoffset: 500;
          animation: tqdm-ekg-anim 2.2s ease-in-out infinite;
        }
        @keyframes tqdm-ekg-anim {
          0%   { stroke-dashoffset: 500; opacity: 1; }
          55%  { stroke-dashoffset: 0;   opacity: 1; }
          80%  { stroke-dashoffset: 0;   opacity: 1; }
          95%  { stroke-dashoffset: 0;   opacity: 0; }
          100% { stroke-dashoffset: 500; opacity: 0; }
        }
      `}</style>
    </div>
  )
}
