// Heuristic (geometry-only, no ML) helper for the MoCA Clock Drawing task.
// Reads the captured vector strokes and estimates two of the three scoring
// criteria: (1) is the outline roughly a circle, (2) do the hands point to
// ~11:10. Number recognition (the 3rd criterion) is intentionally NOT attempted.
//
// This is a *suggestion* for the tester, never the final score. Thresholds are
// first-pass defaults and should be calibrated against real drawings.

import type { StrokeData, Stroke, StrokePoint } from './drawStrokes'

export interface ClockAnalysis {
  hasEnough: boolean
  circle: { ok: boolean; roundness: number } // roundness 0–1
  hands: { ok: boolean; angles: number[]; note: string }
  /** suggested points for the two auto-checked criteria (0–2; numbers excluded) */
  suggestedScore: number
}

// 11:10 target hand angles, measured clockwise from 12 o'clock (up):
//   minute hand (10 min) → points at "2"  = 60°
//   hour hand  (~11)     → points at "11" = 335°
const TARGET_MINUTE = 60
const TARGET_HOUR = 335
const ANGLE_TOL = 25 // degrees
const ROUNDNESS_MIN = 0.8

type Ctr = { x: number; y: number }

const dist = (p: StrokePoint, c: Ctr) => Math.hypot(p[0] - c.x, p[1] - c.y)
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
const std = (a: number[]) => {
  const m = mean(a)
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)))
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

function centroid(pts: StrokePoint[]): Ctr {
  return { x: mean(pts.map((p) => p[0])), y: mean(pts.map((p) => p[1])) }
}

// Angle of `tip` seen from `c`, clockwise from 12 o'clock (canvas y is down).
function clockAngle(tip: StrokePoint, c: Ctr): number {
  const ang = (Math.atan2(tip[0] - c.x, -(tip[1] - c.y)) * 180) / Math.PI
  return (ang + 360) % 360
}

// Smallest absolute difference between two angles (0–180).
function angDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

export function analyzeClock(data: StrokeData | null | undefined): ClockAnalysis {
  const strokes: Stroke[] = (data?.strokes ?? []).filter((s) => s.pts.length > 0)
  const totalPts = strokes.reduce((n, s) => n + s.pts.length, 0)

  if (strokes.length === 0 || totalPts < 8) {
    return {
      hasEnough: false,
      circle: { ok: false, roundness: 0 },
      hands: { ok: false, angles: [], note: 'ข้อมูลน้อยเกินไป — วาดก่อน' },
      suggestedScore: 0,
    }
  }

  // ── Circle: use the longest stroke as the outline candidate ──
  const outline = strokes.reduce((a, b) => (b.pts.length > a.pts.length ? b : a))
  const center = centroid(outline.pts)
  const radii = outline.pts.map((p) => dist(p, center))
  const meanR = mean(radii)
  const cv = meanR > 1 ? std(radii) / meanR : 1
  const roundness = clamp01(1 - cv)
  const circleOk = roundness >= ROUNDNESS_MIN && meanR > 20

  // ── Hands: other strokes that start near the center and extend outward ──
  const others = strokes.filter((s) => s !== outline)
  const candidates = others
    .map((s) => {
      const nearest = Math.min(...s.pts.map((p) => dist(p, center)))
      const tip = s.pts.reduce((far, p) => (dist(p, center) > dist(far, center) ? p : far), s.pts[0])
      return { nearest, tip, len: dist(tip, center) }
    })
    .filter((c) => c.nearest < meanR * 0.5 && c.len > meanR * 0.3)
    .sort((a, b) => b.len - a.len)

  let handsOk = false
  let angles: number[] = []
  let note = 'ไม่พบเข็มชัดเจน (ต้องมีเส้นลากจากจุดกลาง 2 เส้น)'

  if (candidates.length >= 2) {
    const [minuteHand, hourHand] = candidates // longest = minute, next = hour
    const aMin = clockAngle(minuteHand.tip, center)
    const aHour = clockAngle(hourHand.tip, center)
    angles = [Math.round(aMin), Math.round(aHour)]
    const minuteOk = angDist(aMin, TARGET_MINUTE) <= ANGLE_TOL
    const hourOk = angDist(aHour, TARGET_HOUR) <= ANGLE_TOL
    handsOk = minuteOk && hourOk
    note = `เข็มยาว ~${Math.round(aMin)}° (เป้า 60° = เลข 2) · เข็มสั้น ~${Math.round(aHour)}° (เป้า 335° = เลข 11)`
  }

  return {
    hasEnough: true,
    circle: { ok: circleOk, roundness },
    hands: { ok: handsOk, angles, note },
    suggestedScore: (circleOk ? 1 : 0) + (handsOk ? 1 : 0),
  }
}
