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
} from 'firebase/firestore'
import { db } from '@/lib/firebaseClient'
import {
  fetchRiskSummaryByFilter,
  triggerManualRiskSummaryJob,
  type RiskSummaryDebug,
} from '@/app/pages/tracking/risk-queries'
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
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])
  const [rawUserDocs, setRawUserDocs] = useState<({ __id: string } & Record<string, unknown>)[]>([])
  const [rawTempDocs, setRawTempDocs] = useState<({ __id: string } & Record<string, unknown>)[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: today,
    to: today,
  })
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date())
  const [riskSummary, setRiskSummary] = useState({ risk: 0, normal: 0, pending: 0, noTest: 0 })
  const [riskDebug, setRiskDebug] = useState<RiskSummaryDebug | null>(null)
  const [riskError, setRiskError] = useState<string | null>(null)
  const [loadingRisk, setLoadingRisk] = useState(false)
  const [provinceFilter, setProvinceFilter] = useState('')
  const [riskKindFilter, setRiskKindFilter] = useState<'all' | 'users' | 'temps'>('all')
  const [riskUserIdFilter, setRiskUserIdFilter] = useState('')
  const [useRiskDateFilter, setUseRiskDateFilter] = useState(false)
  const [showRiskDiagnostic, setShowRiskDiagnostic] = useState(false)
  const [triggeringRiskJob, setTriggeringRiskJob] = useState(false)
  const [riskJobMessage, setRiskJobMessage] = useState<string | null>(null)
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
      (snap) => {
        setRawUserDocs(snap.docs.map((d) => ({ __id: d.id, ...(d.data() as Record<string, unknown>) })))
        setLastUpdated(new Date())
      }
    )
    const unsubTemps = onSnapshot(
      query(collection(db, 'temps'), where('timestamp', '>=', startTime), where('timestamp', '<=', endTime)),
      (snap) => {
        setRawTempDocs(snap.docs.map((d) => ({ __id: d.id, ...(d.data() as Record<string, unknown>) })))
        setLastUpdated(new Date())
      }
    )
    return () => { unsubUsers(); unsubTemps() }
  }, [startTime, endTime])

  const total = stats.userCount + stats.tempCount

  // Doc-id sets that respect Firebase dateRange (already applied via onSnapshot
  // query) and the provinceFilter. These are the user_ids the Risk Summary
  // should consider, so the two stat blocks share the same population.
  const userDocIds = useMemo(() => {
    return rawUserDocs
      .filter((d) => !provinceFilter || extractProvince(d.liveAddress as string | undefined) === provinceFilter)
      .map((d) => d.__id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  }, [rawUserDocs, provinceFilter])

  const tempDocIds = useMemo(() => {
    return rawTempDocs
      .filter((d) => !provinceFilter || extractProvince(d.liveAddress as string | undefined) === provinceFilter)
      .map((d) => d.__id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  }, [rawTempDocs, provinceFilter])

  // Stable string keys so the effect below only re-fires when the actual id
  // set changes, not whenever Firebase emits a new snapshot with the same data.
  const userDocIdsKey = useMemo(() => userDocIds.slice().sort().join(','), [userDocIds])
  const tempDocIdsKey = useMemo(() => tempDocIds.slice().sort().join(','), [tempDocIds])

  const refreshRiskSummary = async () => {
    setLoadingRisk(true)
    setRiskError(null)
    try {
      const parentDateFrom = useRiskDateFilter && dateRange?.from ? new Date(dateRange.from) : undefined
      const parentDateTo = useRiskDateFilter
        ? dateRange?.to
          ? new Date(dateRange.to)
          : dateRange?.from
            ? new Date(dateRange.from)
            : undefined
        : undefined
      if (parentDateFrom) parentDateFrom.setHours(0, 0, 0, 0)
      if (parentDateTo) parentDateTo.setHours(23, 59, 59, 999)

      const result = await fetchRiskSummaryByFilter({
        province: provinceFilter || undefined,
        kind: riskKindFilter,
        userId: riskUserIdFilter.trim() || undefined,
        userDocIds,
        tempDocIds,
        parentDateFrom,
        parentDateTo,
        debug: true,
      })
      const { debug, ...summary } = result
      setRiskSummary(summary)
      setRiskDebug(debug ?? null)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('refreshRiskSummary error', err)
      setRiskError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setLoadingRisk(false)
    }
  }

  const manualTriggerRiskJob = async () => {
    setTriggeringRiskJob(true)
    setRiskJobMessage(null)
    try {
      const result = await triggerManualRiskSummaryJob()
      const startedAt = result.startedAt
        ? new Date(result.startedAt).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : '--:--:--'
      setRiskJobMessage(
        `สั่งรัน ${result.jobName ?? 'checkpd-risk-summary'} สำเร็จ (${result.region ?? 'asia-southeast1'}) เวลา ${startedAt} [${result.mode ?? 'gcloud'}]`
      )
      await refreshRiskSummary()
    } catch (err) {
      setRiskJobMessage(err instanceof Error ? `Manual trigger ไม่สำเร็จ: ${err.message}` : 'Manual trigger ไม่สำเร็จ')
    } finally {
      setTriggeringRiskJob(false)
    }
  }

  useEffect(() => {
    refreshRiskSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    provinceFilter,
    riskKindFilter,
    riskUserIdFilter,
    useRiskDateFilter,
    dateRange?.from,
    dateRange?.to,
    userDocIdsKey,
    tempDocIdsKey,
  ])

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
                  <select
                    value={riskKindFilter}
                    onChange={(e) => setRiskKindFilter(e.target.value as 'all' | 'users' | 'temps')}
                    className="border border-border rounded-md px-3 py-1.5 text-sm bg-card/90 backdrop-blur-md focus:ring-2 focus:ring-primary focus:border-primary"
                    title="แหล่งข้อมูลความเสี่ยง"
                  >
                    <option value="all">Risk: ทั้งหมด</option>
                    <option value="users">Risk: users</option>
                    <option value="temps">Risk: temps</option>
                  </select>
                  <input
                    value={riskUserIdFilter}
                    onChange={(e) => setRiskUserIdFilter(e.target.value)}
                    placeholder="กรอง user_id"
                    className="border border-border rounded-md px-3 py-1.5 text-sm bg-card/90 backdrop-blur-md focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <label className="inline-flex items-center gap-2 text-xs text-muted-foreground" title="โหมดเสริม: กรองด้วย parent_timestamp ใน Supabase ทับซ้อนกับชุด user_id ที่ได้จาก Firebase">
                    <input
                      type="checkbox"
                      checked={useRiskDateFilter}
                      onChange={(e) => setUseRiskDateFilter(e.target.checked)}
                    />
                    กรองเพิ่มด้วย parent_timestamp (Supabase)
                  </label>
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
                <div className="flex items-center gap-2">
                  <button onClick={refreshRiskSummary} disabled={loadingRisk} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
                    {loadingRisk ? 'กำลังดึงข้อมูล...' : 'Refresh ผลคัดกรอง'}
                  </button>
                  <button
                    onClick={manualTriggerRiskJob}
                    disabled={triggeringRiskJob}
                    className="rounded-md border border-primary/50 bg-primary/5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    {triggeringRiskJob ? 'กำลัง trigger...' : 'Manual Trigger Risk Job'}
                  </button>
                </div>
              </div>
              {riskJobMessage && <p className="mb-3 text-xs text-muted-foreground">{riskJobMessage}</p>}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="เสี่ยง" value={riskSummary.risk} icon={<TrendingUp className="h-5 w-5" />} description="พบความเสี่ยงจากการประเมินล่าสุด" colorClass="text-red-600" />
                <StatCard title="ปกติ" value={riskSummary.normal} icon={<UserCheck className="h-5 w-5" />} description="ไม่พบความเสี่ยง" colorClass="text-green-600" />
                <StatCard title="ยังไม่ประเมิน" value={riskSummary.pending} icon={<Clock className="h-5 w-5" />} description="ทำแบบทดสอบแล้ว แต่ยังไม่มีผล" colorClass="text-gray-500" />
                <StatCard title="ไม่ได้ทดสอบ" value={riskSummary.noTest} icon={<Activity className="h-5 w-5" />} description="ยังไม่มีบันทึกการทดสอบ" colorClass="text-yellow-600" />
              </div>

              {(() => {
                const sentTotal = userDocIds.length + tempDocIds.length
                const matched = riskDebug?.counts?.matchedRows ?? 0
                const status: 'success' | 'none' | 'error' | 'idle' = riskError
                  ? 'error'
                  : !riskDebug
                    ? 'idle'
                    : matched > 0
                      ? 'success'
                      : 'none'
                const statusBadge = {
                  success: { label: 'success', cls: 'bg-green-500/15 text-green-600 border-green-500/30' },
                  none: { label: 'none (no match)', cls: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
                  error: { label: 'error', cls: 'bg-red-500/15 text-red-600 border-red-500/30' },
                  idle: { label: 'idle', cls: 'bg-muted text-muted-foreground border-border' },
                }[status]

                return (
                  <div className="mt-4 rounded-lg border border-border/60 bg-card/70 backdrop-blur-md p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">Risk match diagnostic</span>
                      <button
                        onClick={() => setShowRiskDiagnostic((v) => !v)}
                        className="rounded-md border border-border/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        {showRiskDiagnostic ? 'ซ่อน' : 'แสดง'}
                      </button>
                      <span className={`rounded-full border px-2 py-0.5 font-medium ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                      {loadingRisk && (
                        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-blue-600">
                          loading…
                        </span>
                      )}
                    </div>

                    {showRiskDiagnostic && (
                      <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">ส่งจาก Firebase: </span>
                        <span className="font-mono">
                          {sentTotal} docs (users {userDocIds.length} / temps {tempDocIds.length})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Supabase rows สแกน: </span>
                        <span className="font-mono">{riskDebug?.counts?.totalRows ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Matched: </span>
                        <span className="font-mono font-semibold text-foreground">{matched}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Service role: </span>
                        <span className="font-mono">{riskDebug ? String(riskDebug.hasServiceRole) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Query chunks: </span>
                        <span className="font-mono">{riskDebug?.counts?.chunks ?? '-'}</span>
                      </div>
                      </div>
                    )}

                    {showRiskDiagnostic && riskDebug?.counts && (
                      <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-5 text-muted-foreground">
                        <span>skip(province): <span className="font-mono">{riskDebug.counts.skippedByProvince}</span></span>
                        <span>skip(kind): <span className="font-mono">{riskDebug.counts.skippedByKind}</span></span>
                        <span>skip(userId): <span className="font-mono">{riskDebug.counts.skippedByUserId}</span></span>
                        <span>skip(docIdSet): <span className="font-mono">{riskDebug.counts.skippedByDocIdSet}</span></span>
                        <span>skip(date): <span className="font-mono">{riskDebug.counts.skippedByDate}</span></span>
                      </div>
                    )}

                    {showRiskDiagnostic && riskDebug?.statusCounter && Object.keys(riskDebug.statusCounter).length > 0 && (
                      <div className="mt-2">
                        <span className="text-muted-foreground">latest_status ที่เจอใน matched rows: </span>
                        <span className="font-mono">
                          {Object.entries(riskDebug.statusCounter)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(', ')}
                        </span>
                      </div>
                    )}

                    {showRiskDiagnostic && riskDebug?.shortCircuit && (
                      <div className="mt-2 text-yellow-600">
                        Short-circuited: <span className="font-mono">{riskDebug.shortCircuit}</span>
                        {' '}— ไม่ได้ query Supabase เพราะ doc-id set ว่าง
                      </div>
                    )}

                    {showRiskDiagnostic && riskError && (
                      <div className="mt-2 text-red-600">Error: <span className="font-mono">{riskError}</span></div>
                    )}

                    {showRiskDiagnostic && status === 'none' && sentTotal > 0 && !riskDebug?.shortCircuit && (
                      <div className="mt-2 text-muted-foreground">
                        ส่ง {sentTotal} doc IDs ไปแล้วแต่ไม่ match กับ user_id ใน <span className="font-mono">checkpd_user_risk</span>.
                        ตรวจดูว่าตารางมีข้อมูลในจังหวัด/kind ที่เลือกหรือไม่ และ user_id เก็บเป็น Firebase doc.id เดียวกันหรือเปล่า
                      </div>
                    )}
                  </div>
                )
              })()}
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
