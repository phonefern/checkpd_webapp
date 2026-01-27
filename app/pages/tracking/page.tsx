
'use client'

import { useEffect, useState, useMemo } from 'react'
import type { DateRange } from 'react-day-picker'
import {
  Download,
  Users,
  TrendingUp,
  Clock,
  UserCheck,
  CircleUser,
  Activity,
} from 'lucide-react'
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebaseClient'
import Image from "next/image"
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { StatCard } from '@/components/ui/stat-card'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { AgeRangeGrid } from '@/components/ui/age-range-grid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/* =======================
   Age helpers (เหมือนเดิม)
======================= */
function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

function getAgeRange(age: number | null): string {
  if (age === null) return 'null'
  if (age <= 10) return '0-10'
  if (age <= 20) return '11-20'
  if (age <= 30) return '21-30'
  if (age <= 40) return '31-40'
  if (age <= 50) return '41-50'
  if (age <= 60) return '51-60'
  if (age <= 70) return '61-70'
  if (age <= 80) return '71-80'
  if (age <= 90) return '81-90'
  return '91-100'
}

export default function TrackingPage() {
  /* =======================
     State (เหมือน UI เดิม)
  ======================= */
  const [userCount, setUserCount] = useState(0)
  const [maleCount, setMaleCount] = useState(0)
  const [femaleCount, setFemaleCount] = useState(0)
  const [tempCount, setTempCount] = useState(0)

  const [ageRanges, setAgeRanges] = useState([
    { range: '0-10', count: 0 },
    { range: '11-20', count: 0 },
    { range: '21-30', count: 0 },
    { range: '31-40', count: 0 },
    { range: '41-50', count: 0 },
    { range: '51-60', count: 0 },
    { range: '61-70', count: 0 },
    { range: '71-80', count: 0 },
    { range: '81-90', count: 0 },
    { range: '91-100', count: 0 },
    { range: 'null', count: 0 },
  ])

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date('2026-01-01'),
    to: new Date('2026-01-27'),
  })
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())


  /* =======================
   MOCK DATA SIMULATION
  ======================= */
  // useEffect(() => {
  //   let interval: NodeJS.Timeout

  //   interval = setInterval(() => {
  //     // random new users
  //     const newUsers = Math.floor(Math.random() * 4) + 1 // 1–4
  //     const newTemps = Math.random() > 0.6 ? 1 : 0

  //     // gender split
  //     let male = 0
  //     let female = 0
  //     for (let i = 0; i < newUsers; i++) {
  //       Math.random() > 0.5 ? male++ : female++
  //     }

  //     // age ranges
  //     const ranges = [...ageRanges]
  //     for (let i = 0; i < newUsers; i++) {
  //       const idx = Math.floor(Math.random() * ranges.length)
  //       ranges[idx] = {
  //         ...ranges[idx],
  //         count: ranges[idx].count + 1,
  //       }
  //     }

  //     setUserCount((v) => v + newUsers)
  //     setMaleCount((v) => v + male)
  //     setFemaleCount((v) => v + female)
  //     setTempCount((v) => v + newTemps)
  //     setAgeRanges(ranges)
  //     setLastUpdated(new Date())
  //   }, 1000)

  //   return () => clearInterval(interval)
  // }, [])

  /* =======================
     Date → Firestore Timestamp
  ======================= */
  const { startTime, endTime } = useMemo(() => {
    if (!dateRange?.from) return { startTime: null, endTime: null }

    const start = new Date(dateRange.from)
    start.setHours(0, 0, 0, 0)

    const end = new Date(dateRange.to ?? dateRange.from)
    end.setHours(23, 59, 59, 999)

    return {
      startTime: Timestamp.fromDate(start),
      endTime: Timestamp.fromDate(end),
    }
  }, [dateRange])

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  /* =======================
     Firestore Realtime Logic
  ======================= */
  useEffect(() => {
    if (!startTime || !endTime) return

    /* ----- users ----- */
    const usersQuery = query(
      collection(db, 'users'),
      where('timestamp', '>=', startTime),
      where('timestamp', '<=', endTime)
    )

    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      let male = 0
      let female = 0

      const ageCounter: Record<string, number> = {
        '0-10': 0,
        '11-20': 0,
        '21-30': 0,
        '31-40': 0,
        '41-50': 0,
        '51-60': 0,
        '61-70': 0,
        '71-80': 0,
        '81-90': 0,
        '91-100': 0,
        null: 0,
      }

      snap.forEach((doc) => {
        const d = doc.data()

        if (d.gender === 'male') male++
        if (d.gender === 'female') female++

        if (d.bod) {
          const age = calculateAge(d.bod.toDate())
          ageCounter[getAgeRange(age)]++
        } else {
          ageCounter['null']++
        }
      })

      setUserCount(snap.size)
      setMaleCount(male)
      setFemaleCount(female)
      setAgeRanges(
        Object.entries(ageCounter).map(([range, count]) => ({
          range,
          count,
        }))
      )
      setLastUpdated(new Date())
    })

    /* ----- temps ----- */
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

  /* =======================
     UI (เหมือนต้นฉบับ 100%)
  ======================= */
  return (
    <main
      className="min-h-screen bg-background relative">
      <Image
        src="/background/checkpd_qr_5.png"
        alt="CheckPD background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-background/50" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    CHECK PD Download Tracking
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Real-time analytics dashboard
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="border-green-500/50 bg-green-500/10 text-green-500"
                >
                  <span className="mr-1.5 h-2 w-2 animate-pulse rounded-full bg-green-500" />
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

        {/* Main */}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Card className="mb-8 overflow-hidden border-purple-900 border-5 backdrop-blur-md"
            style={{
              background:
                'radial-gradient(circle at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 40%, rgba(240,244,255,0.85) 100%)',
            }}
          >
            <CardContent className="p-5">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-12 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Download className="h-6 w-6 text-primary" />
                </div>
                <p className="mb-2 text-3xl font-medium uppercase tracking-wider text-muted-foreground">
                  ยอดดาวน์โหลดทั้งหมด
                </p>
                <AnimatedCounter
                  value={total}
                  className="text-[9rem] md:text-[11rem] lg:text-[13rem] font-extrabold leading-none"
                />
                <div className="mt-4 flex items-center gap-2 text-sm text-green-500">
                  <TrendingUp className="h-4 w-4" />
                  <span>อัปเดตแบบเรียลไทม์</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="ผู้ใช้งาน (Users)"
              value={userCount}
              text="text-left"
              icon={<Users className="h-6 w-6" />}
              description="จำนวนผู้ใช้ที่ดาวน์โหลด"
              colorClass="text-primary"
            />
            <StatCard
              title="ผู้ชาย"
              value={maleCount}
              text="text-left"
              icon={<CircleUser className="h-6 w-6" />}
              description="จำนวนผู้ใช้เพศชาย"
              colorClass="text-blue-500"
            />
            <StatCard
              title="ผู้หญิง"
              value={femaleCount}
              text="text-left"
              icon={<CircleUser className="h-6 w-6" />}
              description="จำนวนผู้ใช้เพศหญิง"
              colorClass="text-pink-500"
            />
            <StatCard
              title="ผู้คัดกรอง (Staff)"
              value={tempCount}
              text="text-left"
              icon={<UserCheck className="h-6 w-6" />}
              description="จำนวนเจ้าหน้าที่คัดกรอง"
              colorClass="text-orange-500"
            />
          </div>

          <div className="mt-6">
            <AgeRangeGrid
              ageRanges={ageRanges}
              className="bg-card/90 backdrop-blur-md"
            />
          </div>

          <Card className="mt-8 border-border/50 bg-card/80 backdrop-blur-md">
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
                    {mounted
                      ? lastUpdated.toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                      : '--:--:--'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">ช่วงวันที่</p>
                  <p className="font-medium text-foreground">
                    {dateRange?.from?.toLocaleDateString('th-TH')} -{' '}
                    {dateRange?.to?.toLocaleDateString('th-TH')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">สถานะ</p>
                  <p className="flex items-center gap-1.5 font-medium text-green-500">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    เชื่อมต่อแบบเรียลไทม์
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
