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
    '0-10': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    '11-20': 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    '21-30': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    '31-40': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    '41-50': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    '51-60': 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    '61-70': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    '71-80': 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20',
    '81-90': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    '91-100': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    'null': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

export function AgeRangeGrid({ ageRanges, className }: AgeRangeGridProps) {
    const total = ageRanges.reduce((sum, item) => sum + item.count, 0)

    return (
        <Card className={cn('overflow-hidden', className)}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl font-medium">
                    <Users className="h-5 w-5 text-primary" />
                    ช่วงอายุ
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    รวมทั้งหมด: <span className="font-semibold text-foreground">{total.toLocaleString()}</span> คน
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-4 md:grid-cols-6">
                    {ageRanges.map((item) => (
                        <div
                            key={item.range}
                            className={cn(
                                'relative flex flex-col items-center justify-center rounded-lg border p-3 transition-all hover:scale-105 text-center',
                                rangeColors[item.range] || 'bg-muted/50 text-muted-foreground border-border'
                            )}
                        >
                            <span className="mb-1 text-xs font-medium opacity-80">
                                {item.range === 'null' ? 'ไม่ระบุ' : `${item.range} ปี`}
                            </span>

                            <AnimatedCounter
                                value={item.count}
                                className="text-lg font-bold tabular-nums"
                            />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
