'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from '@/app/providers/SessionProvider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { logActivity } from '@/lib/activityLog'
import { Shuffle } from 'lucide-react'
import {
  CAP_SWATCH,
  CONFUSION_AXES_DISPLAY,
  D15_DISPLAY_POSITIONS,
  D15_REFERENCE_SOURCES,
  PASS_MAX_CROSSINGS,
  classifyD15Severity,
  describeD15Severity,
  scoreD15,
  type D15Result,
  type D15Severity,
} from '@/lib/colorVisionD15'
import { supabase } from '@/lib/supabase'

interface Props {
  open: boolean
  patientId: number
  onClose: () => void
  onSaved: () => void
}

type SessionKey = 're_test' | 're_retest' | 'le_test' | 'le_retest'
type SessionState = Record<SessionKey, string[]>
type ClearedState = Record<SessionKey, boolean>
type SavedRecord = Record<string, number[] | string | number | null>
type EntryMode = 'keypad' | 'color'

const CAP_COUNT = 15
const CAP_OPTIONS = Array.from({ length: CAP_COUNT }, (_, index) => index + 1)
const EMPTY_ORDER = Array.from({ length: CAP_COUNT }, () => '')
const EMPTY_STATE: SessionState = {
  re_test: [...EMPTY_ORDER],
  re_retest: [...EMPTY_ORDER],
  le_test: [...EMPTY_ORDER],
  le_retest: [...EMPTY_ORDER],
}
const EMPTY_CLEARED: ClearedState = {
  re_test: false,
  re_retest: false,
  le_test: false,
  le_retest: false,
}

const SESSIONS: { key: SessionKey; eye: 're' | 'le'; phase: 'test' | 'retest'; label: string; shortLabel: string }[] = [
  { key: 're_test', eye: 're', phase: 'test', label: 'Right eye - Test', shortLabel: 'RE Test' },
  { key: 're_retest', eye: 're', phase: 'retest', label: 'Right eye - Retest', shortLabel: 'RE Retest' },
  { key: 'le_test', eye: 'le', phase: 'test', label: 'Left eye - Test', shortLabel: 'LE Test' },
  { key: 'le_retest', eye: 'le', phase: 'retest', label: 'Left eye - Retest', shortLabel: 'LE Retest' },
]

const SELECT_COLUMNS = SESSIONS.map((session) => `color_paper_${session.key}_order`).join(',')

function shuffleCaps() {
  const caps = [...CAP_OPTIONS]
  for (let index = caps.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = caps[index]
    caps[index] = caps[swapIndex]
    caps[swapIndex] = current
  }
  return caps
}

function createShuffledCapState(): Record<SessionKey, number[]> {
  return {
    re_test: shuffleCaps(),
    re_retest: shuffleCaps(),
    le_test: shuffleCaps(),
    le_retest: shuffleCaps(),
  }
}

function cloneEmptyState(): SessionState {
  return {
    re_test: [...EMPTY_ORDER],
    re_retest: [...EMPTY_ORDER],
    le_test: [...EMPTY_ORDER],
    le_retest: [...EMPTY_ORDER],
  }
}

function toFieldPrefix(session: SessionKey) {
  return `color_paper_${session}`
}

function parseStoredOrder(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from({ length: CAP_COUNT }, (_, index) => value[index] == null ? '' : String(value[index]))
  }
  if (typeof value === 'string' && value.trim()) {
    const parts = value.split(/[,\s]+/).filter(Boolean)
    return Array.from({ length: CAP_COUNT }, (_, index) => parts[index] ?? '')
  }
  return [...EMPTY_ORDER]
}

function parseInputs(values: string[]) {
  return values.map((value) => {
    const trimmed = value.trim()
    if (!trimmed) return null
    const numeric = Number(trimmed)
    return Number.isInteger(numeric) ? numeric : NaN
  })
}

function validateOrder(values: string[]) {
  const parsed = parseInputs(values)
  const entered = parsed.filter((value): value is number => value !== null)
  if (entered.length === 0) return { status: 'blank' as const, order: null, message: null }
  if (entered.length < CAP_COUNT || parsed.some((value) => Number.isNaN(value))) {
    return { status: 'invalid' as const, order: null, message: 'กรอกหมายเลข cap ให้ครบ 15 ช่อง' }
  }

  const outOfRange = entered.filter((value) => value < 1 || value > 15)
  if (outOfRange.length > 0) {
    return { status: 'invalid' as const, order: null, message: `มีหมายเลขนอกช่วง 1-15: ${outOfRange.join(', ')}` }
  }

  const counts = new Map<number, number>()
  for (const value of entered) counts.set(value, (counts.get(value) ?? 0) + 1)
  const duplicates = Array.from(counts.entries()).filter(([, count]) => count > 1).map(([value]) => value)
  const missing = Array.from({ length: CAP_COUNT }, (_, index) => index + 1).filter((value) => !counts.has(value))

  if (duplicates.length > 0 || missing.length > 0) {
    const parts = [
      duplicates.length ? `ซ้ำ: ${duplicates.join(', ')}` : '',
      missing.length ? `ขาด: ${missing.join(', ')}` : '',
    ].filter(Boolean)
    return { status: 'invalid' as const, order: null, message: parts.join(' | ') }
  }

  return { status: 'complete' as const, order: entered, message: null }
}

const SEVERITY_BANNER_CLASS: Record<D15Severity, string> = {
  normal: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  mild: 'border-lime-200 bg-lime-50 text-lime-900',
  moderate: 'border-amber-200 bg-amber-50 text-amber-900',
  severe: 'border-rose-200 bg-rose-50 text-rose-900',
}

function readableTextColor(hex: string): '#020617' | '#ffffff' {
  const clean = hex.replace('#', '')
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255
  const linear = [r, g, b].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  return luminance > 0.42 ? '#020617' : '#ffffff'
}

function swatchTextShadow(textColor: string) {
  return textColor === '#ffffff' ? '0 1px 2px rgba(2, 6, 23, 0.65)' : '0 1px 1px rgba(255, 255, 255, 0.65)'
}

export default function QaColorVisionForm({ open, patientId, onClose, onSaved }: Props) {
  const { session } = useSession()
  const [orders, setOrders] = useState<SessionState>(cloneEmptyState)
  const [cleared, setCleared] = useState<ClearedState>(EMPTY_CLEARED)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null)
  const [shuffledCaps, setShuffledCaps] = useState<Record<SessionKey, number[]>>(createShuffledCapState)

  useEffect(() => {
    if (!open) return
    setEntryMode(null)
    setShuffledCaps(createShuffledCapState())
  }, [open])

  const results = useMemo(() => {
    return SESSIONS.reduce<Record<SessionKey, D15Result | null>>((acc, sessionItem) => {
      const validation = validateOrder(orders[sessionItem.key])
      acc[sessionItem.key] = validation.status === 'complete' ? scoreD15(validation.order) : null
      return acc
    }, { re_test: null, re_retest: null, le_test: null, le_retest: null })
  }, [orders])

  useEffect(() => {
    if (!open) return

    setLoading(true)
    const load = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .schema('core')
          .from('vision_tests_v2')
          .select(SELECT_COLUMNS)
          .eq('patient_id', patientId)
          .maybeSingle()

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        const record = (data ?? {}) as SavedRecord
        const next = cloneEmptyState()
        for (const sessionItem of SESSIONS) {
          next[sessionItem.key] = parseStoredOrder(record[`${toFieldPrefix(sessionItem.key)}_order`])
        }
        setOrders(next)
        setCleared(EMPTY_CLEARED)
        setError(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open, patientId])

  const setCapValue = (sessionKey: SessionKey, capIndex: number, value: string) => {
    const normalized = value.replace(/[^\d]/g, '').slice(0, 2)
    setOrders((prev) => ({
      ...prev,
      [sessionKey]: prev[sessionKey].map((item, index) => index === capIndex ? normalized : item),
    }))
    setCleared((prev) => ({ ...prev, [sessionKey]: false }))
  }

  const pasteOrder = (sessionKey: SessionKey, text: string) => {
    const parts = text.match(/\d+/g)
    if (!parts || parts.length <= 1) return false
    const next = Array.from({ length: CAP_COUNT }, (_, index) => parts[index] ?? '')
    setOrders((prev) => ({ ...prev, [sessionKey]: next }))
    setCleared((prev) => ({ ...prev, [sessionKey]: false }))
    return true
  }

  const clearSession = (sessionKey: SessionKey) => {
    setOrders((prev) => ({ ...prev, [sessionKey]: [...EMPTY_ORDER] }))
    setCleared((prev) => ({ ...prev, [sessionKey]: true }))
  }

  // color mode: tapping a swatch fills the next empty slot (order = tap sequence)
  const tapCap = (sessionKey: SessionKey, cap: number) => {
    setOrders((prev) => {
      const values = prev[sessionKey]
      if (values.some((value) => Number(value) === cap)) return prev
      const nextEmpty = values.findIndex((value) => !value.trim())
      if (nextEmpty === -1) return prev
      return { ...prev, [sessionKey]: values.map((value, index) => index === nextEmpty ? String(cap) : value) }
    })
    setCleared((prev) => ({ ...prev, [sessionKey]: false }))
  }

  // color mode: undo the most recently tapped cap (no per-slot picker to correct a single mistake)
  const undoLastCap = (sessionKey: SessionKey) => {
    setOrders((prev) => {
      const values = prev[sessionKey]
      let lastFilled = -1
      for (let index = values.length - 1; index >= 0; index -= 1) {
        if (values[index].trim()) { lastFilled = index; break }
      }
      if (lastFilled === -1) return prev
      return { ...prev, [sessionKey]: values.map((value, index) => index === lastFilled ? '' : value) }
    })
  }

  const chooseEntryMode = (mode: EntryMode) => {
    setEntryMode(mode)
    if (mode === 'color') setShuffledCaps(createShuffledCapState())
  }

  const shuffleSessionCaps = (sessionKey: SessionKey) => {
    setShuffledCaps((prev) => ({ ...prev, [sessionKey]: shuffleCaps() }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const payload: Record<string, unknown> = { patient_id: patientId }
    let hasChanges = false

    for (const sessionItem of SESSIONS) {
      const prefix = toFieldPrefix(sessionItem.key)
      const validation = validateOrder(orders[sessionItem.key])

      if (validation.status === 'invalid') {
        setSaving(false)
        setError(`${sessionItem.shortLabel}: ${validation.message}`)
        return
      }

      if (validation.status === 'blank') {
        if (!cleared[sessionItem.key]) continue
        payload[`${prefix}_order`] = null
        payload[`${prefix}_crossings`] = null
        payload[`${prefix}_axis`] = null
        payload[`${prefix}_tes`] = null
        payload[prefix] = null
        payload[`${prefix}_abnormal`] = null
        hasChanges = true
        continue
      }

      const result = scoreD15(validation.order)
      payload[`${prefix}_order`] = validation.order
      payload[`${prefix}_crossings`] = result.crossings
      payload[`${prefix}_axis`] = result.axis
      payload[`${prefix}_tes`] = null
      payload[prefix] = result.summary
      payload[`${prefix}_abnormal`] = result.pass ? 0 : 1
      hasChanges = true
    }

    if (!hasChanges) {
      setSaving(false)
      setError('ยังไม่มี session ที่กรอกครบหรือกดล้าง')
      return
    }

    const { error: saveError } = await supabase
      .schema('core')
      .from('vision_tests_v2')
      .upsert(payload, { onConflict: 'patient_id' })

    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }

    logActivity({
      action: 'UPDATE',
      page: 'qa',
      description: 'D-15 color vision',
      userEmail: session?.user?.email ?? 'admin@checkpd.local',
    })
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-h-[92dvh] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:w-[calc(100vw-2rem)] sm:!max-w-[calc(100vw-2rem)] sm:p-6 lg:w-[calc(100vw-3rem)] lg:!max-w-[calc(100vw-3rem)] xl:w-[calc(100vw-4rem)] xl:!max-w-[1500px] 2xl:!max-w-[1680px]"
      >
        <DialogHeader className="pr-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <DialogTitle className="leading-snug">การมองเห็นสี (Farnsworth D-15)</DialogTitle>
            {!loading && entryMode && (
              <button
                type="button"
                onClick={() => setEntryMode(null)}
                className="w-fit shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-slate-700 hover:text-slate-900"
              >
                เปลี่ยนวิธีกรอก
              </button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-slate-700" />
          </div>
        ) : !entryMode ? (
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">เลือกวิธีกรอกลำดับที่ผู้ป่วยเรียง (เลือกได้ทั้ง 4 session ในครั้งนี้)</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => chooseEntryMode('keypad')}
                className="rounded-lg border-2 border-slate-200 p-4 text-left transition-colors hover:border-slate-900 hover:bg-slate-50"
              >
                <span className="text-2xl">🔢</span>
                <p className="mt-2 text-sm font-semibold text-slate-900">กล่องสี (แบบเดิม) — ดูเลขแล้วพิมพ์</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ดูหมายเลข cap จากกล่องทดสอบจริง แล้วกรอกเลข 1-15 ตามลำดับที่ผู้ป่วยเรียง
                </p>
              </button>
              <button
                type="button"
                onClick={() => chooseEntryMode('color')}
                className="rounded-lg border-2 border-slate-200 p-4 text-left transition-colors hover:border-slate-900 hover:bg-slate-50"
              >
                <span className="text-2xl">🎨</span>
                <p className="mt-2 text-sm font-semibold text-slate-900">แตะสีโดยตรง (ภาพใหญ่)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  เทียบสีที่เห็นบนกล่องจริงกับสีขนาดใหญ่บนจอ แล้วแตะเลือกทีละอันตามลำดับ ไม่ต้องอ่านเลข
                </p>
              </button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="re" className="mt-2">
            <TabsList>
              <TabsTrigger value="re">ตาขวา (RE)</TabsTrigger>
              <TabsTrigger value="le">ตาซ้าย (LE)</TabsTrigger>
            </TabsList>
            <TabsContent value="re" className="mt-3">
              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                <SessionBlock
                  sessionKey="re_test"
                  title="TEST - ลำดับที่ผู้ป่วยเรียง"
                  entryMode={entryMode}
                  values={orders.re_test}
                  result={results.re_test}
                  onChange={setCapValue}
                  onClear={clearSession}
                  onPaste={pasteOrder}
                  onTapCap={tapCap}
                  onUndo={undoLastCap}
                  capOrder={shuffledCaps.re_test}
                  onShuffle={shuffleSessionCaps}
                />
                <SessionBlock
                  sessionKey="re_retest"
                  title="RETEST - ลำดับที่ผู้ป่วยเรียง"
                  entryMode={entryMode}
                  values={orders.re_retest}
                  result={results.re_retest}
                  onChange={setCapValue}
                  onClear={clearSession}
                  onPaste={pasteOrder}
                  onTapCap={tapCap}
                  onUndo={undoLastCap}
                  capOrder={shuffledCaps.re_retest}
                  onShuffle={shuffleSessionCaps}
                />
              </div>
            </TabsContent>
            <TabsContent value="le" className="mt-3">
              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                <SessionBlock
                  sessionKey="le_test"
                  title="TEST - ลำดับที่ผู้ป่วยเรียง"
                  entryMode={entryMode}
                  values={orders.le_test}
                  result={results.le_test}
                  onChange={setCapValue}
                  onClear={clearSession}
                  onPaste={pasteOrder}
                  onTapCap={tapCap}
                  onUndo={undoLastCap}
                  capOrder={shuffledCaps.le_test}
                  onShuffle={shuffleSessionCaps}
                />
                <SessionBlock
                  sessionKey="le_retest"
                  title="RETEST - ลำดับที่ผู้ป่วยเรียง"
                  entryMode={entryMode}
                  values={orders.le_retest}
                  result={results.le_retest}
                  onChange={setCapValue}
                  onClear={clearSession}
                  onPaste={pasteOrder}
                  onTapCap={tapCap}
                  onUndo={undoLastCap}
                  capOrder={shuffledCaps.le_retest}
                  onShuffle={shuffleSessionCaps}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="mt-4 rounded border border-slate-200 bg-white p-3 text-xs text-muted-foreground">
          <p>
            เกณฑ์ระบบ: <span className="font-semibold text-slate-900">major crossing</span> = เส้นที่ลากข้ามระยะมากกว่า 2 cap steps
            (เทียบเท่าเส้นที่พาดผ่านกลางวงในกระดาษ) — <span className="font-semibold text-slate-900">Pass</span> เมื่อ crossing ไม่เกิน{' '}
            {PASS_MAX_CROSSINGS} เส้น, <span className="font-semibold text-red-600">Fail</span> เมื่อ 2 เส้นขึ้นไป
          </p>
          <p className="mt-1">
            ยิ่ง crossing เยอะ = ยิ่งรุนแรง (ไม่ใช่แค่ pass/fail ตายตัว) — 0-1 เส้นถือว่าเป็นการสลับเล็กน้อยตามปกติ ยังไม่นับว่าผิดปกติ
          </p>
        </div>

        <div className="mt-3 rounded border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">คำอธิบายแกนสีเบื้องต้น</p>
          <p className="mt-1 text-xs text-muted-foreground">
            ชนิดของแกน (Protan/Deutan/Tritan) ตัดสินจาก <span className="font-semibold text-slate-900">ทิศทาง/มุมของเส้น crossing</span>{' '}
            เทียบกับเส้นแกนอ้างอิงบนกราฟ — <span className="font-semibold text-slate-900">ไม่ใช่จำนวนสีที่เส้นพาดผ่าน</span> ระบบหามุมจากพิกัดสีจริง
            (ไม่ได้กะด้วยสายตาแบบกระดาษ) แล้วจับเข้ากลุ่มแกนที่ใกล้ที่สุด ถ้าผ่านเกณฑ์ (crossing ≤ {PASS_MAX_CROSSINGS}) จะสรุปเป็น Normal เสมอ
            ไม่ว่าเส้นที่เหลือจะเฉียงไปทางไหน
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            หมายเหตุ: Protan กับ Deutan แยกยากโดยธรรมชาติเพราะแกนจริงทั้งสองเกือบขนานกัน (ห่างกันแค่ ~17°) — ทั้งบนกระดาษและในระบบ
            ให้ยึดจำนวน crossing และ pass/fail เป็นหลัก ส่วน label แกนเป็นค่าประมาณ
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
            <div className="rounded border border-slate-200 p-2">
              <p className="font-semibold text-slate-900">Protan</p>
              <p className="mt-1 text-muted-foreground">สับสนกลุ่มสีแดง-เขียว โดยหนักไปทางการรับรู้สีแดงลดลง</p>
            </div>
            <div className="rounded border border-slate-200 p-2">
              <p className="font-semibold text-slate-900">Deutan</p>
              <p className="mt-1 text-muted-foreground">สับสนกลุ่มสีแดง-เขียว โดยหนักไปทางการรับรู้สีเขียวลดลง</p>
            </div>
            <div className="rounded border border-slate-200 p-2">
              <p className="font-semibold text-slate-900">Tritan</p>
              <p className="mt-1 text-muted-foreground">สับสนกลุ่มสีน้ำเงิน-เหลือง หรือโทนฟ้า/ม่วงกับเหลือง</p>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded border border-blue-100 bg-blue-50/60 p-3">
          <p className="text-sm font-semibold text-slate-900">แหล่งอ้างอิง D-15 ในระบบ</p>
          <p className="mt-1 text-xs text-slate-600">
            ใช้สำหรับตรวจสอบที่มาของพิกัดสี cap, แนวคิด confusion angle และเหตุผลที่แยกข้อมูล raw summary ออกจากข้อความช่วยแปลผล
          </p>
          <ul className="mt-2 space-y-2">
            {D15_REFERENCE_SOURCES.map((source) => (
              <li key={source.url} className="text-xs text-slate-700">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-700 underline-offset-2 hover:underline"
                >
                  {source.label}
                </a>
                <span className="text-slate-500"> — {source.citation}</span>
                <span className="block text-slate-500">{source.note}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">
            หมายเหตุ: ระดับเล็กน้อย/ปานกลาง/รุนแรงเป็นเกณฑ์ช่วยอ่านผลในระบบจากจำนวนเส้นตัด ไม่ได้บันทึกลงฐานข้อมูล และยังคงปรับได้ตามดุลยพินิจแพทย์
          </p>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <DialogFooter className="sticky bottom-0 bg-white border-t -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving || loading} className="bg-slate-900 text-white hover:bg-slate-800">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SessionBlock(props: {
  sessionKey: SessionKey
  title: string
  entryMode: EntryMode
  values: string[]
  result: D15Result | null
  onChange: (sessionKey: SessionKey, capIndex: number, value: string) => void
  onClear: (sessionKey: SessionKey) => void
  onPaste: (sessionKey: SessionKey, text: string) => boolean
  onTapCap: (sessionKey: SessionKey, cap: number) => void
  onUndo: (sessionKey: SessionKey) => void
  capOrder: number[]
  onShuffle: (sessionKey: SessionKey) => void
}) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const validation = validateOrder(props.values)
  const complete = validation.status === 'complete'
  const statusClass = props.result?.pass ? 'text-slate-900' : 'text-red-600'
  const severity = props.result ? classifyD15Severity(props.result.crossings) : null
  const usedCaps = new Set(props.values.map((value) => Number(value)).filter((value) => Number.isInteger(value)))
  const filledCount = props.values.filter((value) => value.trim()).length

  // leading run of valid, distinct caps — drives the live preview path before the order is complete
  const previewCaps: number[] = (() => {
    const out: number[] = []
    const seen = new Set<number>()
    for (const raw of props.values) {
      const trimmed = raw.trim()
      const n = Number(trimmed)
      if (!trimmed || !Number.isInteger(n) || n < 1 || n > 15 || seen.has(n)) break
      seen.add(n)
      out.push(n)
    }
    return out
  })()

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{props.title}</h3>
          <p className="text-xs text-muted-foreground">
            {props.entryMode === 'keypad'
              ? 'ดูเลข cap จากกล่องจริงแล้วกรอกตามลำดับที่ผู้ป่วยวาง ไม่รวม reference cap'
              : 'แตะสีที่ตรงกับ cap ของผู้ป่วยตามลำดับ ระบบจะใส่ให้ในช่องถัดไปให้เอง ไม่รวม reference cap'}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => props.onClear(props.sessionKey)} className="shrink-0">
          ล้าง
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <div className="mb-3 flex flex-col gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium text-slate-700">เลือกแล้ว {filledCount} / {CAP_COUNT}</span>
            <span className={complete ? 'text-slate-900' : 'text-muted-foreground'}>
              {complete
                ? 'พร้อมบันทึก'
                : props.entryMode === 'keypad'
                  ? 'แตะช่องลำดับแล้วเลือกเลข cap'
                  : 'แตะสีตามลำดับที่เห็น'}
            </span>
          </div>

          {props.entryMode === 'keypad' ? (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10 2xl:grid-cols-5">
              {props.values.map((value, index) => (
                <CapSlotPicker
                  key={index}
                  slotIndex={index}
                  value={value}
                  usedCaps={usedCaps}
                  open={activeSlot === index}
                  onOpenChange={(nextOpen) => setActiveSlot(nextOpen ? index : null)}
                  onSelect={(cap) => {
                    props.onChange(props.sessionKey, index, cap == null ? '' : String(cap))
                    const nextEmpty = props.values.findIndex((item, itemIndex) => itemIndex > index && !item.trim())
                    setActiveSlot(nextEmpty === -1 ? null : nextEmpty)
                  }}
                />
              ))}
            </div>
          ) : (
            <div>
              <ColorTapGrid
                values={props.values}
                capOrder={props.capOrder}
                onTap={(cap) => props.onTapCap(props.sessionKey, cap)}
              />
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => props.onShuffle(props.sessionKey)}
                  className="inline-flex items-center gap-1.5 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:border-slate-700 hover:text-slate-900"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  คละสี
                </button>
                <button
                  type="button"
                  onClick={() => props.onUndo(props.sessionKey)}
                  disabled={filledCount === 0}
                  className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:border-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↩ ย้อนกลับตัวล่าสุด
                </button>
              </div>
            </div>
          )}

          {validation.status === 'invalid' && (
            <p className="mt-2 text-xs text-red-600">{validation.message}</p>
          )}
          {validation.status === 'blank' && (
            <p className="mt-2 text-xs text-muted-foreground">ปล่อยว่างได้ถ้ายังไม่ได้ทำ session นี้</p>
          )}
          {props.result && severity && (
            <div className={`mt-3 rounded-md border px-3 py-2 text-sm font-semibold ${SEVERITY_BANNER_CLASS[severity]}`}>
              {describeD15Severity(props.result)}
            </div>
          )}
          {props.result && (
            <p className={`mt-2 text-sm font-semibold ${statusClass}`}>ผล: {props.result.summary}</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 rounded-md bg-slate-50/70 px-2 py-3">
          <D15Plot result={complete ? props.result : null} previewCaps={complete ? [] : previewCaps} />
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded bg-slate-700" /> ลำดับ</span>
            <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded bg-red-600" /> เส้นตัด</span>
          </div>
          <p className="max-w-[260px] text-center text-[11px] leading-snug text-muted-foreground">
            สีที่แสดงเป็นค่าประมาณเพื่อช่วยจำ ไม่ใช่สีมาตรฐานที่ปรับเทียบแล้ว
          </p>
        </div>
      </div>
    </div>
  )
}

function CapSlotPicker(props: {
  slotIndex: number
  value: string
  usedCaps: Set<number>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (cap: number | null) => void
}) {
  const currentCap = Number(props.value)
  const hasValue = props.value.trim().length > 0
  const capOptions = Array.from({ length: CAP_COUNT }, (_, index) => index + 1)

  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`min-h-11 rounded-md border px-2 py-1.5 text-center transition-colors ${
            hasValue
              ? 'border-slate-900 bg-white text-slate-900 shadow-xs'
              : 'border-slate-300 bg-white text-slate-500 hover:border-slate-700'
          }`}
        >
          <span className="block text-[11px] font-medium text-muted-foreground">#{props.slotIndex + 1}</span>
          <span className="block text-lg font-semibold leading-5">{hasValue ? props.value : '-'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[268px] rounded-lg p-3 shadow-lg" align="center">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">เลือก cap สำหรับลำดับ #{props.slotIndex + 1}</p>
          <button
            type="button"
            onClick={() => props.onSelect(null)}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:border-slate-700"
          >
            ล้างช่องนี้
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {capOptions.map((cap) => {
            const selected = cap === currentCap
            const unavailable = props.usedCaps.has(cap) && !selected
            return (
              <button
                key={cap}
                type="button"
                disabled={unavailable}
                onClick={() => props.onSelect(cap)}
                className={`h-9 rounded-md border text-sm font-semibold transition-colors ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : unavailable
                      ? 'cursor-not-allowed border-slate-200 bg-white text-slate-300'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-slate-800'
                }`}
              >
                {cap}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">เลขสีจางคือ cap ที่เลือกไปแล้วใน session นี้</p>
      </PopoverContent>
    </Popover>
  )
}

// "แตะสีโดยตรง" mode: big color tiles, tap fills the next empty slot (order = tap sequence).
// Cap numbers are intentionally hidden here so the examiner uses colour only, with cap 0/P shown as the reference.
function ColorTapGrid({ values, capOrder, onTap }: { values: string[]; capOrder: number[]; onTap: (cap: number) => void }) {
  const positionByCap = new Map<number, number>()
  values.forEach((value, index) => {
    const cap = Number(value)
    if (value.trim() && Number.isInteger(cap)) positionByCap.set(cap, index + 1)
  })
  const caps = capOrder.length === CAP_COUNT ? capOrder : CAP_OPTIONS
  const pilotSwatch = CAP_SWATCH[0]
  const pilotTextColor = readableTextColor(pilotSwatch)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
        <div
          className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md border-2 border-slate-950 text-lg font-bold sm:h-14 sm:w-20"
          style={{ backgroundColor: pilotSwatch, color: pilotTextColor, textShadow: swatchTextShadow(pilotTextColor) }}
        >
          P
        </div>
        <div className="min-w-0 text-xs text-slate-600">
          <p className="font-semibold text-slate-900">สีตั้งต้น / Reference cap</p>
          <p>ใช้เป็นจุดเริ่มเทียบสี ไม่ต้องแตะเลือก และไม่ถูกบันทึกในลำดับ 1-15</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {caps.map((cap) => {
          const swatch = CAP_SWATCH[cap]
          const position = positionByCap.get(cap)
          const used = position != null
          const textColor = readableTextColor(swatch)
          return (
            <button
              key={cap}
              type="button"
              disabled={used}
              onClick={() => onTap(cap)}
              aria-label={used ? `Selected at position ${position}` : 'Select colour cap'}
              className={`relative flex h-14 items-center justify-center rounded-lg border-2 transition-transform sm:h-16 lg:h-20 ${
                used ? 'border-slate-950' : 'border-slate-200 hover:scale-[1.03] hover:border-slate-900 active:scale-95'
              }`}
              style={{ backgroundColor: swatch, color: textColor, textShadow: swatchTextShadow(textColor) }}
            >
              {used && <span className="text-2xl font-bold">#{position}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function D15Plot({ result, previewCaps }: { result: D15Result | null; previewCaps: number[] }) {
  const size = 320
  const center = size / 2
  const radius = 112

  const point = (cap: number) => ({
    x: center + D15_DISPLAY_POSITIONS[cap].x * radius,
    y: center - D15_DISPLAY_POSITIONS[cap].y * radius,
  })

  const axisLine = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180
    const dx = Math.cos(rad) * radius * 0.9
    const dy = Math.sin(rad) * radius * 0.9
    return { x1: center - dx, y1: center + dy, x2: center + dx, y2: center - dy }
  }

  // place each axis label at a distinct end so the near-vertical Protan/Deutan lines never collide
  const axisLabelEnd: Record<string, 1 | -1> = { protan: 1, deutan: -1, tritan: 1 }
  const axisLabelPoint = (angleDeg: number, end: 1 | -1) => {
    const rad = (angleDeg * Math.PI) / 180
    return { x: center + end * Math.cos(rad) * radius * 1.22, y: center - end * Math.sin(rad) * radius * 1.22 }
  }

  // live preview path while the order is still incomplete
  const previewPath = result ? [] : [0, ...previewCaps]

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="aspect-square w-full max-w-[340px] rounded bg-white sm:max-w-[360px]">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="1" />

      {Object.entries(CONFUSION_AXES_DISPLAY).map(([axis, config]) => {
        const line = axisLine(config.angleDeg)
        const lp = axisLabelPoint(config.angleDeg, axisLabelEnd[axis])
        return (
          <g key={axis}>
            <line {...line} stroke="#cbd5e1" strokeWidth="1.25" strokeDasharray="5 5" />
            <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-[10px] font-semibold">
              {config.label}
            </text>
          </g>
        )
      })}

      {/* faint reference loop = the correct arrangement (pilot → 1 → … → 15) */}
      <polyline
        points={Array.from({ length: 16 }, (_, cap) => { const p = point(cap); return `${p.x},${p.y}` }).join(' ')}
        fill="none"
        stroke="#eef2f7"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {previewPath.length > 1 && previewPath.slice(1).map((to, index) => {
        const from = point(previewPath[index])
        const t = point(to)
        return <line key={`pv-${index}`} x1={from.x} y1={from.y} x2={t.x} y2={t.y} stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      })}

      {result?.segments.map((segment, index) => {
        const from = point(segment.from)
        const to = point(segment.to)
        return (
          <line
            key={`${segment.from}-${segment.to}-${index}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={segment.isCrossing ? '#dc2626' : '#2563eb'}
            strokeWidth={segment.isCrossing ? 3 : 2}
            strokeLinecap="round"
            opacity={segment.isCrossing ? 0.9 : 0.7}
          />
        )
      })}

      {Array.from({ length: 16 }, (_, cap) => {
        const p = point(cap)
        const isPilot = cap === 0
        // push the label just outside each cap, along its own outward direction
        const pos = D15_DISPLAY_POSITIONS[cap]
        const mag = Math.hypot(pos.x, pos.y) || 1
        const lx = p.x + (pos.x / mag) * 14
        const ly = p.y - (pos.y / mag) * 14
        const swatch = CAP_SWATCH[cap]
        return (
          <g key={cap}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isPilot ? 8 : 6}
              fill={swatch}
              stroke={isPilot ? '#020617' : '#0f172a'}
              strokeWidth={isPilot ? 3 : 1.75}
            />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-slate-600 text-[11px] font-semibold">
              {isPilot ? 'P' : cap}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
