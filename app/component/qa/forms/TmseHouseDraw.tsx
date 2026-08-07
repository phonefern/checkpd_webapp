'use client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { StrokeData, Stroke, StrokePoint, drawStrokesOnCtx, STROKE_VERSION } from '@/lib/drawStrokes'

// TMSE "จงวาดภาพต่อไปนี้ให้เหมือนตัวอย่าง" — a single on-screen drawing of the house
// (square + triangular roof). Draws with mouse + touch (Pointer Events), palm
// rejection via pen-only mode, undo/redo/clear, and point-thinning. The drawing
// is captured as vector strokes (reusing lib/drawStrokes) and surfaced through
// `onChange` so the parent can persist it as JSONB. Scoring stays manual (0–2).

const PEN = '#1e3a8a'
const MIN_POINT_DIST = 2.5
const CANVAS_W = 460
const CANVAS_H = 360

type Controller = {
  setData: (data: StrokeData | null | undefined) => void
  clear: () => void
  undo: () => void
  redo: () => void
}

interface Props {
  /** stored strokes to replay (null = blank) */
  value: StrokeData | null
  /** fires whenever the drawing changes, so the parent can persist it */
  onChange: (data: StrokeData) => void
  /** view-only: replay but disable editing */
  readOnly?: boolean
}

export default function TmseHouseDraw({ value, onChange, readOnly = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctlRef = useRef<Controller | null>(null)
  const [history, setHistory] = useState({ canUndo: false, canRedo: false })
  const [penOnly, setPenOnly] = useState(false)

  const penOnlyRef = useRef(penOnly)
  penOnlyRef.current = penOnly
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const lastEmittedRef = useRef<StrokeData | null>(null)
  const onHistoryRef = useRef<(h: { canUndo: boolean; canRedo: boolean }) => void>(() => {})
  onHistoryRef.current = (h) =>
    setHistory((prev) => (prev.canUndo === h.canUndo && prev.canRedo === h.canRedo ? prev : h))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let strokes: Stroke[] = []
    let redo: Stroke[] = []
    let current: Stroke | null = null
    let drawing = false

    const tuple = (e: PointerEvent): StrokePoint => {
      const r = canvas.getBoundingClientRect()
      return [(e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height)]
    }
    const redraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const all = current ? [...strokes, current] : strokes
      drawStrokesOnCtx(ctx, all, { color: PEN, width: 3 })
    }
    const commit = () => {
      const payload: StrokeData = { v: STROKE_VERSION, w: canvas.width, h: canvas.height, strokes }
      lastEmittedRef.current = payload
      onChangeRef.current(payload)
    }
    const notify = () => onHistoryRef.current({ canUndo: strokes.length > 0, canRedo: redo.length > 0 })

    const down = (e: PointerEvent) => {
      if (readOnly) return
      if (e.pointerType === 'pen' && !penOnlyRef.current) setPenOnly(true)
      if (penOnlyRef.current && e.pointerType !== 'pen') return
      e.preventDefault()
      canvas.setPointerCapture(e.pointerId)
      drawing = true
      current = { pts: [tuple(e)] }
      redraw()
    }
    const move = (e: PointerEvent) => {
      if (!drawing || !current) return
      if (penOnlyRef.current && e.pointerType !== 'pen') return
      e.preventDefault()
      const p = tuple(e)
      const last = current.pts[current.pts.length - 1]
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < MIN_POINT_DIST) return
      current.pts.push(p)
      redraw()
    }
    const end = () => {
      if (!drawing || !current) return
      drawing = false
      if (current.pts.length > 0) {
        strokes = [...strokes, current]
        redo = []
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

    ctlRef.current = {
      setData: (d) => {
        strokes = d?.strokes ? d.strokes.map((s) => ({ pts: s.pts.slice() })) : []
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
    }

    redraw()
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', end)
      canvas.removeEventListener('pointercancel', end)
    }
  }, [readOnly])

  // Replay stored strokes when they arrive (skip our own echoes).
  useEffect(() => {
    if (value !== undefined && value !== lastEmittedRef.current) ctlRef.current?.setData(value)
  }, [value, readOnly])

  const btn = 'text-sm font-medium rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white'

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      {!readOnly && (
        <label className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <input type="checkbox" checked={penOnly} onChange={(e) => setPenOnly(e.target.checked)} className="h-4 w-4" />
          ✏️ โหมดปากกาเท่านั้น
          <span className="text-xs text-slate-400">(กันฝ่ามือ · ใช้นิ้วเลื่อนจอได้ · เปิดเองเมื่อแตะด้วยปากกา)</span>
        </label>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1.5">ตัวอย่าง</p>
          <Image
            src="/img/asset/tmse_house.png"
            alt="รูปบ้านตัวอย่าง"
            width={200}
            height={200}
            className="w-[160px] h-auto rounded-lg border border-slate-300 bg-white p-1.5 object-contain"
          />
        </div>
        <div className="flex-1 min-w-[240px]">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ touchAction: penOnly ? 'pan-y' : 'none' }}
            className="w-full h-auto rounded-lg border border-slate-300 bg-white"
            aria-label="พื้นที่วาดรูปบ้าน"
          />
        </div>
      </div>

      {!readOnly && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => ctlRef.current?.undo()} disabled={!history.canUndo} className={btn}>
            ↩ ย้อนกลับ
          </button>
          <button type="button" onClick={() => ctlRef.current?.redo()} disabled={!history.canRedo} className={btn}>
            ↪ ทำซ้ำ
          </button>
          <button
            type="button"
            onClick={() => ctlRef.current?.clear()}
            disabled={!history.canUndo && !history.canRedo}
            className="text-sm font-medium rounded-lg border border-red-200 bg-white px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            🗑 ล้างทั้งหมด
          </button>
        </div>
      )}
    </div>
  )
}
