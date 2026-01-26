'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebaseClient'
import type { DateRange } from 'react-day-picker'
import {
  Download,
  Users,
  FileText,
  Activity,
  TrendingUp,
  Clock,
} from 'lucide-react'

import { DateRangePicker } from '@/components/ui/date-range-picker'
import { StatCard } from '@/components/ui/stat-card'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function TrackingPage() {
  const [userCount, setUserCount] = useState(0)
  const [tempCount, setTempCount] = useState(0)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date('2026-01-01'),
    to: new Date('2026-01-26'),
  })
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // สร้าง Timestamp จาก date range
  const { startTime, endTime } = useMemo(() => {
    if (!dateRange?.from) {
      return { startTime: null, endTime: null }
    }

    const start = new Date(dateRange.from)
    start.setHours(0, 0, 0, 0)

    const end = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from)
    end.setHours(23, 59, 59, 999)

    return {
      startTime: Timestamp.fromDate(start),
      endTime: Timestamp.fromDate(end),
    }
  }, [dateRange])

  useEffect(() => {
    if (!startTime || !endTime) return

    // ===== users =====
    const usersQuery = query(
      collection(db, 'users'),
      where('timestamp', '>=', startTime),
      where('timestamp', '<=', endTime)
    )

    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      setUserCount(snap.size)
      setLastUpdated(new Date())
    })

    // ===== temps =====
    const tempsQuery = query(
      collection(db, 'temps'),
      where('timestamp', '>=', startTime),
      where('timestamp', '<=', endTime)
    )

    const unsubTemps = onSnapshot(tempsQuery, (snap) => {
      setTempCount(snap.size)
      setLastUpdated(new Date())
    })

    return () => {
      unsubUsers()
      unsubTemps()
    }
  }, [startTime, endTime])

  const total = userCount + tempCount

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Download Tracking
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time analytics dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="border-accent/50 bg-accent/10 text-accent"
              >
                <span className="mr-1.5 h-2 w-2 animate-pulse rounded-full bg-accent" />
                Live
              </Badge>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Total Downloads Hero Card */}
        <Card className="mb-8 overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <p className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                ยอดดาวน์โหลดทั้งหมด
              </p>
              <AnimatedCounter
                value={total}
                className="text-7xl font-bold tracking-tight text-foreground"
              />
              <div className="mt-4 flex items-center gap-2 text-sm text-accent">
                <TrendingUp className="h-4 w-4" />
                <span>อัปเดตแบบเรียลไทม์</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="ผู้ใช้งาน (Users)"
            value={userCount}
            icon={<Users className="h-6 w-6" />}
            description="จำนวนผู้ใช้ที่ดาวน์โหลด"
            colorClass="text-primary"
          />
          <StatCard
            title="ไฟล์ชั่วคราว (Temps)"
            value={tempCount}
            icon={<FileText className="h-6 w-6" />}
            description="จำนวนการดาวน์โหลดชั่วคราว"
            colorClass="text-accent"
          />
          <StatCard
            title="รวมทั้งหมด"
            value={total}
            icon={<Download className="h-6 w-6" />}
            description="ยอดดาวน์โหลดรวม"
            colorClass="text-chart-3"
          />
        </div>

        {/* Footer Info */}
        <Card className="mt-8 border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              ข้อมูลระบบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">อัปเดตล่าสุด</p>
                <p className="font-medium text-foreground">
                  {lastUpdated.toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">ช่วงวันที่</p>
                <p className="font-medium text-foreground">
                  {dateRange?.from?.toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  -{' '}
                  {dateRange?.to?.toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">สถานะ</p>
                <p className="flex items-center gap-1.5 font-medium text-accent">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                  เชื่อมต่อแบบเรียลไทม์
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
