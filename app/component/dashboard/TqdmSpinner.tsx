"use client"

import { useEffect, useState } from "react"

type Props = {
  label?: string
  detail?: string
}

export default function TqdmSpinner({ label = "กำลังโหลดข้อมูล", detail }: Props) {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const tick = setInterval(() => {
      setPct((prev) => {
        const remaining = 95 - prev
        if (remaining <= 0) return prev
        return prev + remaining * 0.06
      })
    }, 120)
    return () => clearInterval(tick)
  }, [])

  return (
    <div className="flex w-[360px] flex-col items-center gap-5">
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
      <div className="mt-5 flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-semibold tracking-wide text-slate-700">{label}</p>
        {detail ? (
          <p className="text-[11px] text-slate-400 leading-relaxed">{detail}</p>
        ) : null}
      </div>

      {/* EKG heartbeat line */}
      <div className="mt-4 w-full overflow-hidden" style={{ filter: "drop-shadow(0 0 4px #0d948866)" }}>
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
