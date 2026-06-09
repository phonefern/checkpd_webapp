"use client"

export default function TableLoadingState() {
  return (
    <div className="relative flex min-h-[540px] select-none flex-col items-center justify-center gap-10 overflow-hidden rounded-xl">
      {/* Subtle medical grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#0d9488 1px, transparent 1px), linear-gradient(90deg, #0d9488 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Radar / sonar animation */}
      <div className="relative flex h-44 w-44 items-center justify-center">
        {/* Sonar ping rings — staggered */}
        {([0, 1, 2] as const).map((i) => (
          <span
            key={i}
            className="absolute inset-0 rounded-full border border-teal-400 animate-ping"
            style={{ animationDuration: "2.8s", animationDelay: `${i * 0.9}s` }}
          />
        ))}

        {/* Static outer track */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 176 176">
          <circle cx="88" cy="88" r="82" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
        </svg>

        {/* Rotating scanner sweep arc */}
        <svg
          className="absolute inset-0 h-full w-full animate-spin"
          style={{ animationDuration: "2.2s" }}
          viewBox="0 0 176 176"
        >
          <defs>
            <linearGradient id="tl-arc-grad" gradientUnits="userSpaceOnUse" x1="176" y1="88" x2="88" y2="0">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <circle
            cx="88" cy="88" r="82"
            fill="none"
            stroke="url(#tl-arc-grad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="515"
            strokeDashoffset="386"
          />
        </svg>

        {/* Inner pulse dot */}
        <div
          className="absolute h-3 w-3 rounded-full bg-teal-400 animate-ping"
          style={{ animationDuration: "1.6s" }}
        />

        {/* Center badge */}
        <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-teal-100 bg-gradient-to-br from-white to-teal-50 shadow-lg">
          <svg className="h-7 w-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
        </div>
      </div>

      {/* EKG heartbeat line */}
      <div className="w-72 overflow-hidden" style={{ filter: "drop-shadow(0 0 4px #0d948888)" }}>
        <svg viewBox="0 0 300 40" className="w-full">
          {/* Ghost baseline */}
          <path
            d="M 0,20 L 300,20"
            fill="none"
            stroke="#ccfbf1"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          {/* Animated EKG pulse */}
          <path
            className="tl-ekg"
            d="M 0,20 L 72,20 L 82,20 L 88,3 L 95,37 L 102,8 L 109,31 L 116,20 L 300,20"
            fill="none"
            stroke="#0d9488"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Label + bouncing dots */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-semibold tracking-wide text-slate-600">กำลังโหลดข้อมูลผู้ป่วย</p>
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500 tl-dot"
              style={{ animationDelay: `${i * 0.22}s` }}
            />
          ))}
        </div>
      </div>

      <style>{`
        .tl-ekg {
          stroke-dasharray: 500;
          stroke-dashoffset: 500;
          animation: tl-ekg-draw 2s ease-in-out infinite;
        }
        @keyframes tl-ekg-draw {
          0%   { stroke-dashoffset: 500; opacity: 1; }
          55%  { stroke-dashoffset: 0;   opacity: 1; }
          80%  { stroke-dashoffset: 0;   opacity: 1; }
          95%  { stroke-dashoffset: 0;   opacity: 0; }
          100% { stroke-dashoffset: 500; opacity: 0; }
        }
        .tl-dot {
          animation: tl-bounce 1.2s ease-in-out infinite;
        }
        @keyframes tl-bounce {
          0%, 100% { transform: translateY(0);   opacity: 0.4; }
          50%       { transform: translateY(-6px); opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
