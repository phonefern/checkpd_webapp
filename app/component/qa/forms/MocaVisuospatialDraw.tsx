'use client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { StrokeData, Stroke, StrokePoint, drawStrokesOnCtx, STROKE_VERSION } from '@/lib/drawStrokes'
import { analyzeClock, ClockAnalysis } from '@/lib/mocaClockCheck'
import { TRAIL_DOTS, TRAIL_DOT_R } from '@/lib/mocaTrail'

// MoCA "Visuospatial / Executive" drawing tasks (Trail Making, Copy Cube, Clock
// Drawing). Draws with mouse + touch via Pointer Events. The drawing is captured
// as vector strokes and surfaced through `onStrokesChange` so the parent can
// persist it as JSONB; passing strokes back in replays them. Per-canvas Undo /
// Redo / Clear edit history. Scoring stays manual (0–5). No guidance — the
// patient draws freely, like paper.

const COLOR = {
  pen: '#1e3a8a',
  ink: '#1e293b',
  hair: '#cbd5e1',
  surface: '#ffffff',
  faint: '#94a3b8',
}

// Only record a new point once the pointer has moved at least this far (in
// canvas units) from the last stored point. Thins the dense pointermove stream
// so the saved JSONB stays small without a visible change to the line.
const MIN_POINT_DIST = 2.5

type TaskKey = 'trail' | 'cube' | 'clock'
type History = { canUndo: boolean; canRedo: boolean }

type Controller = {
  setData: (data: StrokeData | null | undefined) => void
  clear: () => void
  undo: () => void
  redo: () => void
  getData: () => StrokeData
}

function tuple(canvas: HTMLCanvasElement, e: PointerEvent): StrokePoint {
  const r = canvas.getBoundingClientRect()
  return [
    (e.clientX - r.left) * (canvas.width / r.width),
    (e.clientY - r.top) * (canvas.height / r.height),
  ]
}

function drawTrailDots(ctx: CanvasRenderingContext2D) {
  for (const d of TRAIL_DOTS) {
    ctx.beginPath()
    ctx.arc(d.x, d.y, TRAIL_DOT_R, 0, Math.PI * 2)
    ctx.fillStyle = COLOR.surface
    ctx.strokeStyle = COLOR.hair
    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = COLOR.ink
    ctx.font = "700 20px 'Segoe UI','Sarabun',sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(d.label, d.x, d.y + 1)
  }
  // Standard printed start/end markers (as on the paper sheet).
  const start = TRAIL_DOTS.find((d) => d.label === '1')
  const end = TRAIL_DOTS.find((d) => d.label === 'จ')
  ctx.fillStyle = COLOR.faint
  ctx.font = "600 13px 'Segoe UI','Sarabun',sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (start) ctx.fillText('จุดเริ่มต้น', start.x, start.y + 40)
  if (end) ctx.fillText('จุดสิ้นสุด', end.x, end.y + 40)
}

interface Props {
  /** current Visuospatial/Executive score (0–5) */
  value: number
  /** called when the tester picks a score */
  onChange: (v: number) => void
  /** stored strokes to replay (null/undefined = start blank) */
  trailStrokes?: StrokeData | null
  cubeStrokes?: StrokeData | null
  clockStrokes?: StrokeData | null
  /** fires whenever a task's drawing changes, so the parent can persist it */
  onStrokesChange?: (task: TaskKey, data: StrokeData) => void
  /** view-only: replay drawings but disable editing */
  readOnly?: boolean
}

export default function MocaVisuospatialDraw({
  value,
  onChange,
  trailStrokes,
  cubeStrokes,
  clockStrokes,
  onStrokesChange,
  readOnly = false,
}: Props) {
  const trailRef = useRef<HTMLCanvasElement>(null)
  const cubeRef = useRef<HTMLCanvasElement>(null)
  const clockRef = useRef<HTMLCanvasElement>(null)

  const trailCtl = useRef<Controller | null>(null)
  const cubeCtl = useRef<Controller | null>(null)
  const clockCtl = useRef<Controller | null>(null)

  const [history, setHistory] = useState<Record<TaskKey, History>>({
    trail: { canUndo: false, canRedo: false },
    cube: { canUndo: false, canRedo: false },
    clock: { canUndo: false, canRedo: false },
  })
  const [clockCheck, setClockCheck] = useState<ClockAnalysis | null>(null)
  // When a stylus is used, ignore finger/palm for DRAWING (palm rejection) and
  // let a finger scroll the page instead. Auto-enables on first pen contact.
  const [penOnly, setPenOnly] = useState(false)
  const penOnlyRef = useRef(penOnly)
  penOnlyRef.current = penOnly

  // Remember the exact object we last emitted per task. When the parent stores
  // it and feeds it back as a prop, we skip replaying it (which would otherwise
  // wipe the in-memory undo/redo stack). Only genuinely external data replays.
  const lastEmittedRef = useRef<Record<TaskKey, StrokeData | null>>({
    trail: null,
    cube: null,
    clock: null,
  })

  // Keep latest callbacks without re-running the setup effect.
  const onStrokesRef = useRef(onStrokesChange)
  onStrokesRef.current = onStrokesChange
  const onHistoryRef = useRef<(task: TaskKey, h: History) => void>(() => {})
  onHistoryRef.current = (task, h) =>
    setHistory((prev) =>
      prev[task].canUndo === h.canUndo && prev[task].canRedo === h.canRedo
        ? prev
        : { ...prev, [task]: h },
    )

  // ── Wire up all three canvases (capture strokes + edit history + replay) ──
  useEffect(() => {
    const build = (
      canvas: HTMLCanvasElement | null,
      task: TaskKey,
      drawBg: ((ctx: CanvasRenderingContext2D) => void) | null,
    ): { controller: Controller; cleanup: () => void } | null => {
      if (!canvas) return null
      const ctx = canvas.getContext('2d')!
      let strokes: Stroke[] = []
      let redo: Stroke[] = []
      let current: Stroke | null = null
      let drawing = false

      const redraw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (drawBg) drawBg(ctx)
        const all = current ? [...strokes, current] : strokes
        drawStrokesOnCtx(ctx, all, { color: COLOR.pen, width: 3 })
      }
      const commit = () => {
        const payload: StrokeData = { v: STROKE_VERSION, w: canvas.width, h: canvas.height, strokes }
        lastEmittedRef.current[task] = payload
        onStrokesRef.current?.(task, payload)
      }
      const notify = () =>
        onHistoryRef.current(task, { canUndo: strokes.length > 0, canRedo: redo.length > 0 })

      const down = (e: PointerEvent) => {
        if (readOnly) return
        // First stylus contact turns on pen-only mode (palm rejection).
        if (e.pointerType === 'pen' && !penOnlyRef.current) setPenOnly(true)
        // In pen-only mode, let finger/palm fall through to the browser (so a
        // finger can scroll the page) instead of drawing.
        if (penOnlyRef.current && e.pointerType !== 'pen') return
        e.preventDefault()
        canvas.setPointerCapture(e.pointerId)
        drawing = true
        current = { pts: [tuple(canvas, e)] }
        redraw()
      }
      const move = (e: PointerEvent) => {
        if (!drawing || !current) return
        if (penOnlyRef.current && e.pointerType !== 'pen') return
        e.preventDefault()
        const p = tuple(canvas, e)
        const last = current.pts[current.pts.length - 1]
        // Skip points that barely moved — keeps the stored stroke lightweight.
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < MIN_POINT_DIST) return
        current.pts.push(p)
        redraw()
      }
      const end = () => {
        if (!drawing || !current) return
        drawing = false
        if (current.pts.length > 0) {
          strokes = [...strokes, current]
          redo = [] // a new stroke invalidates the redo stack
        }
        current = null
        redraw()
        commit()
        notify()
      }

      if (!readOnly) {
        canvas.addEventListener('pointerdown', down)
        canvas.addEventListener('pointermove', move)
        canvas.addEventListener('pointerup', end)
        canvas.addEventListener('pointercancel', end)
      }

      const controller: Controller = {
        setData: (data) => {
          strokes = data?.strokes ? data.strokes.map((s) => ({ pts: s.pts.slice() })) : []
          redo = []
          current = null
          drawing = false
          redraw()
          notify()
        },
        clear: () => {
          strokes = []
          redo = []
          current = null
          drawing = false
          redraw()
          commit()
          notify()
        },
        undo: () => {
          if (strokes.length === 0) return
          redo = [...redo, strokes[strokes.length - 1]]
          strokes = strokes.slice(0, -1)
          redraw()
          commit()
          notify()
        },
        redo: () => {
          if (redo.length === 0) return
          strokes = [...strokes, redo[redo.length - 1]]
          redo = redo.slice(0, -1)
          redraw()
          commit()
          notify()
        },
        getData: () => ({ v: STROKE_VERSION, w: canvas.width, h: canvas.height, strokes }),
      }

      redraw()
      return {
        controller,
        cleanup: () => {
          canvas.removeEventListener('pointerdown', down)
          canvas.removeEventListener('pointermove', move)
          canvas.removeEventListener('pointerup', end)
          canvas.removeEventListener('pointercancel', end)
        },
      }
    }

    const trail = build(trailRef.current, 'trail', drawTrailDots)
    const cube = build(cubeRef.current, 'cube', null)
    const clock = build(clockRef.current, 'clock', null)
    trailCtl.current = trail?.controller ?? null
    cubeCtl.current = cube?.controller ?? null
    clockCtl.current = clock?.controller ?? null

    return () => { trail?.cleanup(); cube?.cleanup(); clock?.cleanup() }
  }, [readOnly])

  // ── Replay stored strokes when they arrive / change (skip our own echoes) ──
  useEffect(() => {
    if (trailStrokes !== undefined && trailStrokes !== lastEmittedRef.current.trail) trailCtl.current?.setData(trailStrokes)
  }, [trailStrokes, readOnly])
  useEffect(() => {
    if (cubeStrokes !== undefined && cubeStrokes !== lastEmittedRef.current.cube) cubeCtl.current?.setData(cubeStrokes)
  }, [cubeStrokes, readOnly])
  useEffect(() => {
    if (clockStrokes !== undefined && clockStrokes !== lastEmittedRef.current.clock) clockCtl.current?.setData(clockStrokes)
  }, [clockStrokes, readOnly])

  const toolbar = (task: TaskKey, ctl: React.RefObject<Controller | null>) => {
    if (readOnly) return null
    const h = history[task]
    const btn = 'text-sm font-medium rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white'
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => ctl.current?.undo()} disabled={!h.canUndo} className={btn}>
          ↩ ย้อนกลับ
        </button>
        <button type="button" onClick={() => ctl.current?.redo()} disabled={!h.canRedo} className={btn}>
          ↪ ทำซ้ำ
        </button>
        <button
          type="button"
          onClick={() => ctl.current?.clear()}
          disabled={!h.canUndo && !h.canRedo}
          className="text-sm font-medium rounded-lg border border-red-200 bg-white px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          🗑 ล้างทั้งหมด
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pen-only toggle (palm rejection + finger scroll) */}
      {!readOnly && (
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <input
            type="checkbox"
            checked={penOnly}
            onChange={(e) => setPenOnly(e.target.checked)}
            className="h-4 w-4"
          />
          ✏️ โหมดปากกาเท่านั้น
          <span className="text-xs text-slate-400">(กันฝ่ามือ · ใช้นิ้วเลื่อนจอได้ · เปิดเองเมื่อแตะด้วยปากกา)</span>
        </label>
      )}

      {/* Trail Making */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-baseline justify-between gap-3 border-b bg-slate-50 px-4 py-3">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">Trail Making</span>
          <span className="text-sm font-semibold text-blue-700 bg-blue-50 rounded px-2 py-0.5">1 คะแนน</span>
        </div>
        <div className="p-4">
          <p className="text-base text-slate-600 mb-3">
            ลากเส้นต่อจุดตามลำดับสลับกัน:   (กดเมาส์/แตะค้างแล้วลากตามที่เข้าใจ) — ผู้ตรวจดูภาพที่วาดแล้วให้คะแนนเอง
          </p>
          <canvas
            ref={trailRef}
            width={720}
            height={440}
            style={{ touchAction: penOnly ? 'pan-y' : 'none' }}
            className="w-full h-auto rounded-lg border border-slate-300 bg-white"
            aria-label="พื้นที่ลากเส้น Trail Making"
          />
          {toolbar('trail', trailCtl)}
        </div>
      </section>

      {/* Copy Cube */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-baseline justify-between gap-3 border-b bg-slate-50 px-4 py-3">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">Copy Cube</span>
          <span className="text-sm font-semibold text-blue-700 bg-blue-50 rounded px-2 py-0.5">1 คะแนน</span>
        </div>
        <div className="p-4">
          <p className="text-base text-slate-600 mb-3">วาดรูปลูกบาศก์ 3 มิติตามตัวอย่าง ต้องมีมิติ มีเส้นขนาน และมุมถูกต้อง</p>
          <div className="flex flex-wrap items-start gap-4">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1.5">ตัวอย่าง</p>
              <Image
                src="/img/asset/Cube.png"
                alt="รูปลูกบาศก์ตัวอย่าง"
                width={160}
                height={160}
                className="w-[140px] h-auto rounded-lg border border-slate-300 bg-white p-1.5 object-contain"
              />
            </div>
            <div className="flex-1 min-w-[240px]">
              <canvas
                ref={cubeRef}
                width={440}
                height={300}
                style={{ touchAction: penOnly ? 'pan-y' : 'none' }}
                className="w-full h-auto rounded-lg border border-slate-300 bg-white"
                aria-label="พื้นที่วาดลูกบาศก์"
              />
            </div>
          </div>
          {toolbar('cube', cubeCtl)}
        </div>
      </section>

      {/* Clock Drawing */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-baseline justify-between gap-3 border-b bg-slate-50 px-4 py-3">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">Clock Drawing</span>
          <span className="text-sm font-semibold text-blue-700 bg-blue-50 rounded px-2 py-0.5">3 คะแนน</span>
        </div>
        <div className="p-4">
          <p className="text-base text-slate-600 mb-3 whitespace-pre-line">{
            'วาดหน้าปัดนาฬิกา ให้เข็มชี้เวลา 11:10 น.\n• รูปทรงวงกลม = 1 คะแนน · ตัวเลข 1–12 ครบและถูกตำแหน่ง = 1 คะแนน · เข็มชี้ 11:10 ถูกต้อง = 1 คะแนน'
          }</p>
          <canvas
            ref={clockRef}
            width={440}
            height={320}
            style={{ touchAction: penOnly ? 'pan-y' : 'none' }}
            className="w-full h-auto rounded-lg border border-slate-300 bg-white"
            aria-label="พื้นที่วาดนาฬิกา"
          />
          {toolbar('clock', clockCtl)}

          {/* Shape-check helper (circle + hands, geometry only — a suggestion) */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                const data = clockCtl.current?.getData()
                setClockCheck(data ? analyzeClock(data) : null)
              }}
              className="text-sm font-medium rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
            >
              🔍 ตรวจรูปทรง (ตัวช่วย)
            </button>

            {clockCheck && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                {!clockCheck.hasEnough ? (
                  <p className="text-slate-500">ยังไม่มีเส้นให้ตรวจ — วาดนาฬิกาก่อน</p>
                ) : (
                  <div className="space-y-1.5">
                    <p className={clockCheck.circle.ok ? 'text-green-700' : 'text-amber-700'}>
                      {clockCheck.circle.ok ? '✓' : '⚠'} วงกลม: ความกลม{' '}
                      <b className="tabular-nums">{Math.round(clockCheck.circle.roundness * 100)}%</b>
                    </p>
                    <p className={clockCheck.hands.ok ? 'text-green-700' : 'text-amber-700'}>
                      {clockCheck.hands.ok ? '✓' : '⚠'} เข็ม: {clockCheck.hands.note}
                    </p>
                    <div className="border-t border-slate-200 pt-1.5 text-slate-600">
                      💡 แนะนำ ~<b className="tabular-nums">{clockCheck.suggestedScore}</b>/2 เกณฑ์ที่ตรวจได้
                      <span className="text-slate-400"> (ยังไม่รวมตัวเลข · ผู้ตรวจตัดสินใจเอง)</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Score selector (manual — matches the real form) */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-baseline justify-between gap-3 border-b bg-slate-50 px-4 py-3">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">คะแนนรวม Visuospatial / Executive</span>
          <span className="text-sm font-semibold text-blue-700 bg-blue-50 rounded px-2 py-0.5">max 5</span>
        </div>
        <div className="p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">
            ผู้ตรวจเลือกคะแนน&nbsp;<span className="font-normal text-slate-500">(Trail 1 + Cube 1 + Clock 3 = สูงสุด 5)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={value === n}
                disabled={readOnly}
                onClick={() => onChange(n)}
                className={`w-10 h-10 rounded-lg border text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  value === n
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
