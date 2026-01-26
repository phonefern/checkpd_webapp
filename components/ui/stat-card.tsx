'use client'

import React from "react"

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { AnimatedCounter } from '@/components/ui/animated-counter'

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  colorClass?: string
  className?: string
}

export function StatCard({
  title,
  value,
  icon,
  description,
  trend,
  colorClass = 'text-primary',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <AnimatedCounter
                value={value}
                className={cn('text-4xl font-bold tracking-tight', colorClass)}
              />
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.isPositive ? 'text-accent' : 'text-destructive'
                  )}
                >
                  {trend.isPositive ? '+' : ''}
                  {trend.value}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg bg-secondary',
              colorClass
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
      {/* Decorative gradient */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-1 opacity-50',
          colorClass === 'text-primary' && 'bg-primary',
          colorClass === 'text-accent' && 'bg-accent',
          colorClass === 'text-chart-1' && 'bg-chart-1',
          colorClass === 'text-chart-3' && 'bg-chart-3',
          colorClass === 'text-chart-4' && 'bg-chart-4',
          colorClass === 'text-chart-5' && 'bg-chart-5',
          colorClass === 'text-red-500' && 'bg-red-500',
          colorClass === 'text-green-500' && 'bg-green-500'
        )}
      />
    </Card>
  )
}
