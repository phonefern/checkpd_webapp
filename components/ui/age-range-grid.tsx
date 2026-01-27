'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { cn } from '@/lib/utils'
import { Users } from 'lucide-react'

interface AgeRangeData {
  range: string
  count: number
}

interface AgeRangeGridProps {
  ageRanges: AgeRangeData[]
  className?: string
}

const rangeColors: Record<string, string> = {
  '0-10': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  '11-20': 'bg-teal-500/10 text-teal-700 border-teal-500/30',
  '21-30': 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30',
  '31-40': 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  '41-50': 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30',
  '51-60': 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  '61-70': 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  '71-80': 'bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/30',
  '81-90': 'bg-pink-500/10 text-pink-700 border-pink-500/30',
  '91-100': 'bg-rose-500/10 text-rose-700 border-rose-500/30',
  null: 'bg-gray-500/10 text-gray-700 border-gray-500/30',
}

export function AgeRangeGrid({ ageRanges, className }: AgeRangeGridProps) {
  const total = ageRanges.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-2xl font-semibold">
          <Users className="h-6 w-6 text-primary" />
          ช่วงอายุ
        </CardTitle>

        <p className="text-base text-muted-foreground">
          รวมทั้งหมด:{' '}
          <span className="font-bold text-foreground">
            {total}
          </span>{' '}
          คน
        </p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {ageRanges.map((item) => (
            <div
              key={item.range}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border px-3 py-5 text-center',
                rangeColors[item.range] ??
                  'bg-muted/50 text-muted-foreground border-border'
              )}
            >
              {/* label */}
              <span className="mb-2 text-base font-medium opacity-80">
                {item.range === 'null' ? 'ไม่ระบุ' : `${item.range} ปี`}
              </span>

              {/* number */}
              <AnimatedCounter
                value={item.count ?? 0}
                className="text-4xl font-extrabold tabular-nums leading-none"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
