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
  MapPin,
  Activity,
} from 'lucide-react'
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
  getDocs,
  limit,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebaseClient'
import Image from "next/image"
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { StatCard } from '@/components/ui/stat-card'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { AgeRangeGrid } from '@/components/ui/age-range-grid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { extractProvince, provinceOptions } from '@/app/pages/pdf/types'
import SidebarLayout from '@/app/component/layout/SidebarLayout'

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
  const [rawUserDocs, setRawUserDocs] = useState<Record<string, unknown>[]>([])
  const [rawTempDocs, setRawTempDocs] = useState<Record<string, unknown>[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date('2026-01-01'),
    to: new Date('2026-01-27'),
  })
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [riskSummary, setRiskSummary] = useState({ risk: 0, normal: 0, pending: 0, noTest: 0 })
  const [loadingRisk, setLoadingRisk] = useState(false)
  const [provinceFilter, setProvinceFilter] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const stats = useMemo(() => {
    let male = 0
    let female = 0
    const ageCounter: Record<string, number> = {
      '0-10': 0, '11-20': 0, '21-30': 0, '31-40': 0, '41-50': 0,
      '51-60': 0, '61-70': 0, '71-80': 0, '81-90': 0, '91-100': 0, null: 0,
    }
    const provinceCounter: Record<string, number> = {}

    for (const d of rawUserDocs) {
      const p = extractProvince(d.liveAddress as string | undefined)
      const pKey = p ?? 'ไม่ระบุ'
      provinceCounter[pKey] = (provinceCounter[pKey] ?? 0) + 1
      if (provinceFilter && p !== provinceFilter) continue
      if (d.gender === 'male') male++
      if (d.gender === 'female') female++
      if (d.bod) {
        const age = calculateAge((d.bod as { toDate: () => Date }).toDate())
        ageCounter[getAgeRange(age)]++
      } else {
        ageCounter['null']++
      }
    }

    const userCount = provinceFilter
      ? rawUserDocs.filter((d) => extractProvince(d.liveAddress as string | undefined) === provinceFilter).length
      : rawUserDocs.length
    const tempCount = provinceFilter
      ? rawTempDocs.filter((d) => extractProvince(d.liveAddress as string | undefined) === provinceFilter).length
      : rawTempDocs.length
    const provinceBreakdown = Object.entries(provinceCounter).sort((a, b) => b[1] - a[1]).slice(0, 10)

    return {
      userCount, maleCount: male, femaleCount: female, tempCount,
      ageRanges: Object.entries(ageCounter).map(([range, count]) => ({ range, count })),
      provinceBreakdown,
    }
  }, [rawUserDocs, rawTempDocs, provinceFilter])

  const { startTime, endTime } = useMemo(() => {
    if (!dateRange?.from) return { startTime: null, endTime: null }
    const start = new Date(dateRange.from)
    start.setHours(0, 0, 0, 0)
    const end = new Date(dateRange.to ?? dateRange.from)
    end.setHours(23, 59, 59, 999)
    return { startTime: Timestamp.fromDate(start), endTime: Timestamp.fromDate(end) }
  }, [dateRange])

  useEffect(() => {
    if (!startTime || !endTime) return
    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('timestamp', '>=', startTime), where('timestamp', '<=', endTime)),
      (snap) => { setRawUserDocs(snap.docs.map((d) => d.data())); setLastUpdated(new Date()) }
    )
    const unsubTemps = onSnapshot(
      query(collection(db, 'temps'), where('timestamp', '>=', startTime), where('timestamp', '<=', endTime)),
      (snap) => { setRawTempDocs(snap.docs.map((d) => d.data())); setLastUpdated(new Date()) }
    )
    return () => { unsubUsers(); unsubTemps() }
  }, [startTime, endTime])

  const total = stats.userCount + stats.tempCount

  const refreshRiskSummary = async () => {
    if (!startTime || !endTime) return
    setLoadingRisk(true)
    let risk = 0, normal = 0, pending = 0, noTest = 0
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), where('timestamp', '>=', startTime), where('timestamp', '<=', endTime)))
      const filteredUserDocs = usersSnap.docs.filter((doc) => !provinceFilter || extractProvince(doc.data().liveAddress) === provinceFilter)
      for (const userDoc of filteredUserDocs) {
        const snap = await getDocs(query(collection(db, 'users', userDoc.id, 'records'), orderBy('lastUpdate', 'desc'), limit(1)))
        if (snap.empty) { noTest++; continue }
        const r = snap.docs[0].data()?.prediction?.risk
        if (r === true) risk++; else if (r === false) normal++; else pending++
      }
      const tempsSnap = await getDocs(query(collection(db, 'temps'), where('timestamp', '>=', startTime), where('timestamp', '<=', endTime)))
      const filteredTempDocs = tempsSnap.docs.filter((doc) => !provinceFilter || extractProvince(doc.data().liveAddress) === provinceFilter)
      for (const tempDoc of filteredTempDocs) {
        const snap = await getDocs(query(collection(db, 'temps', tempDoc.id, 'records'), orderBy('lastUpdate', 'desc'), limit(1)))
        if (snap.empty) { noTest++; continue }
        const r = snap.docs[0].data()?.prediction?.risk
        if (r === true) risk++; else if (r === false) normal++; else pending++
      }
      setRiskSummary({ risk, normal, pending, noTest })
      setLastUpdated(new Date())
    } catch (err) {
      console.error('refreshRiskSummary error', err)
    } finally {
      setLoadingRisk(false)
    }
  }

  return (
    <SidebarLayout activePath="/pages/tracking">
      <main className="min-h-screen bg-background relative">
        <Image src="/background/checkpd_qr_5.png" alt="CheckPD background" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-background/50" />

        <div className="relative z-10">
          <header className="border-b border-border bg-card/80 backdrop-blur-md">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">CHECK PD Download Tracking</h1>
                    <p className="text-sm text-muted-foreground">Real-time analytics dashboard</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-500">
                    <span className="mr-1.5 h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    Live
                  </Badge>
                  <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
                  <select
                    value={provinceFilter}
                    onChange={(e) => setProvinceFilter(e.target.value === 'null' ? '' : e.target.value)}
                    className="border border-border rounded-md px-3 py-1.5 text-sm bg-card/90 backdrop-blur-md focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">ทุกจังหวัด</option>
                    {provinceOptions.filter((o) => o.value !== 'null').map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {provinceFilter && (
                    <button onClick={() => setProvinceFilter('')} className="text-xs text-muted-foreground hover:text-foreground underline">
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Card className="mb-10 overflow-hidden border-purple-900/50 bg-card/80 backdrop-blur-md">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm uppercase tracking-wider text-muted-foreground">
                    ยอดดาวน์โหลดทั้งหมด{provinceFilter ? ` · ${provinceFilter}` : ''}
                  </p>
                  <AnimatedCounter value={total} className="mt-2 text-[7rem] md:text-[9rem] font-extrabold leading-none" />
                  <p className="mt-2 flex items-center gap-1 text-xs text-green-500">
                    <TrendingUp className="h-3 w-3" />
                    อัปเดตแบบเรียลไทม์
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="mb-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  ผลการคัดกรอง (จากการทดสอบล่าสุด){provinceFilter ? ` · ${provinceFilter}` : ''}
                </h2>
                <button onClick={refreshRiskSummary} disabled={loadingRisk} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
                  {loadingRisk ? 'กำลังดึงข้อมูล...' : 'Refresh ผลคัดกรอง'}
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="เสี่ยง" value={riskSummary.risk} icon={<TrendingUp className="h-5 w-5" />} description="พบความเสี่ยงจากการประเมินล่าสุด" colorClass="text-red-600" />
                <StatCard title="ปกติ" value={riskSummary.normal} icon={<UserCheck className="h-5 w-5" />} description="ไม่พบความเสี่ยง" colorClass="text-green-600" />
                <StatCard title="ยังไม่ประเมิน" value={riskSummary.pending} icon={<Clock className="h-5 w-5" />} description="ทำแบบทดสอบแล้ว แต่ยังไม่มีผล" colorClass="text-gray-500" />
                <StatCard title="ไม่ได้ทดสอบ" value={riskSummary.noTest} icon={<Activity className="h-5 w-5" />} description="ยังไม่มีบันทึกการทดสอบ" colorClass="text-yellow-600" />
              </div>
            </div>

            <div className="mb-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                สรุปสถานะผู้ใช้{provinceFilter ? ` · ${provinceFilter}` : ''}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="ผู้ใช้งาน (Users)" value={stats.userCount} icon={<Users className="h-5 w-5" />} description="จำนวนผู้ใช้ทั้งหมด" colorClass="text-primary" />
                <StatCard title="ผู้ชาย" value={stats.maleCount} icon={<CircleUser className="h-5 w-5" />} description="จำนวนผู้ใช้เพศชาย" colorClass="text-blue-500" />
                <StatCard title="ผู้หญิง" value={stats.femaleCount} icon={<CircleUser className="h-5 w-5" />} description="จำนวนผู้ใช้เพศหญิง" colorClass="text-pink-500" />
                <StatCard title="ผู้คัดกรอง (Staff)" value={stats.tempCount} icon={<UserCheck className="h-5 w-5" />} description="จำนวนเจ้าหน้าที่คัดกรอง" colorClass="text-orange-500" />
              </div>
            </div>

            <div className="mt-6">
              <AgeRangeGrid ageRanges={stats.ageRanges} className="bg-card/90 backdrop-blur-md" />
            </div>

            {stats.provinceBreakdown.length > 0 && (
              <Card className="mt-8 border-border/50 bg-card/80 backdrop-blur-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4" />
                    ยอดผู้ใช้ตามจังหวัด (Top 10)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.provinceBreakdown.map(([province, count]) => {
                      const max = stats.provinceBreakdown[0]?.[1] ?? 1
                      const pct = Math.round((count / max) * 100)
                      return (
                        <div key={province} className="flex items-center gap-3">
                          <button
                            className="w-32 shrink-0 text-right text-xs font-medium hover:text-primary hover:underline"
                            onClick={() => setProvinceFilter(province === 'ไม่ระบุ' ? '' : province)}
                            title="กรองตามจังหวัดนี้"
                          >
                            {province}
                          </button>
                          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-8 shrink-0 text-xs text-muted-foreground text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    คลิกชื่อจังหวัดเพื่อกรองข้อมูล • ยอดรวมจาก users collection ทั้งหมดในช่วงวันที่เลือก
                  </p>
                </CardContent>
              </Card>
            )}

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
                      {mounted ? lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
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
    </SidebarLayout>
  )
}
