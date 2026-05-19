"use client"

import * as React from "react"

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
  }
>

export function ChartContainer({
  children,
  className,
}: React.PropsWithChildren<{ className?: string; config?: ChartConfig }>) {
  return <div className={className}>{children}</div>
}

export function ChartTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ value?: number; name?: string }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-white px-2 py-1 text-xs shadow">
      {payload.map((entry, idx) => (
        <div key={idx}>
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
  )
}
