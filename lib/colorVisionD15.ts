export type D15Axis = 'normal' | 'protan' | 'deutan' | 'tritan'

export interface D15Point {
  x: number
  y: number
  angleDeg: number
  index: number
}

export interface D15Segment {
  from: number
  to: number
  isCrossing: boolean
  axis: Exclude<D15Axis, 'normal'> | null
}

export interface D15Result {
  crossings: number
  axis: D15Axis
  pass: boolean
  segments: D15Segment[]
  summary: string
}

export const CROSSING_GAP_THRESHOLD = 2
export const PASS_MAX_CROSSINGS = 1

// ---------------------------------------------------------------------------
// Source data
// ---------------------------------------------------------------------------
// CIE 1931 (x, y) chromaticities of the 16 Farnsworth D-15 caps (pilot = index 0),
// from Farnsworth (1947) as tabulated in the R `CVD` package `FarnsworthD15` dataset.
// These are the real cap colours — caps 1..15 form a closed hue loop and the pilot
// sits next to cap 1. We plot/score in this real geometry instead of an evenly
// spaced schematic circle so the diagram and the confusion-axis classification match
// the physical test.
const CAP_XY: Record<number, { x: number; y: number }> = {
  0: { x: 0.228, y: 0.254 }, // pilot — 10B 5/6
  1: { x: 0.235, y: 0.277 }, // 5B 5/4
  2: { x: 0.247, y: 0.301 }, // 10BG 5/4
  3: { x: 0.254, y: 0.322 }, // 5BG 5/4
  4: { x: 0.264, y: 0.346 }, // 10G 5/4
  5: { x: 0.278, y: 0.375 }, // 5G 5/4
  6: { x: 0.312, y: 0.397 }, // 10GY 5/4
  7: { x: 0.350, y: 0.412 }, // 5GY 5/4
  8: { x: 0.390, y: 0.406 }, // 5Y 5/4
  9: { x: 0.407, y: 0.388 }, // 10YR 5/4
  10: { x: 0.412, y: 0.351 }, // 2.5YR 5/4
  11: { x: 0.397, y: 0.330 }, // 7.5R 5/4
  12: { x: 0.376, y: 0.312 }, // 2.5R 5/4
  13: { x: 0.343, y: 0.293 }, // 5RP 5/4
  14: { x: 0.326, y: 0.276 }, // 10P 5/4
  15: { x: 0.295, y: 0.261 }, // 5P 5/4
}

// Copunctal (confusion) points in CIE 1931 xy — the single point that every confusion
// line of a given dichromat passes through (Judd). The direction of a defect's
// confusion lines through the cap cluster is (cluster centroid − copunctal), which
// gives each axis its angle. A patient's crossing line is classified by the axis it
// runs most parallel to.
const COPUNCTAL_XY: Record<Exclude<D15Axis, 'normal'>, { x: number; y: number }> = {
  protan: { x: 0.7465, y: 0.2535 },
  deutan: { x: 1.4000, y: -0.4000 },
  tritan: { x: 0.1748, y: 0.0000 },
}

// CIE 1931 xy → CIE 1976 u'v' (uniform chromaticity scale). Confusion lines stay
// straight under this projective map, and the cap loop becomes near-circular.
function xyToUv(x: number, y: number): { u: number; v: number } {
  const d = -2 * x + 12 * y + 3
  return { u: (4 * x) / d, v: (9 * y) / d }
}

const CAP_UV = Object.fromEntries(
  Object.entries(CAP_XY).map(([key, p]) => [Number(key), xyToUv(p.x, p.y)]),
) as Record<number, { u: number; v: number }>

const CENTROID = (() => {
  const caps = Object.values(CAP_UV)
  const u = caps.reduce((sum, p) => sum + p.u, 0) / caps.length
  const v = caps.reduce((sum, p) => sum + p.v, 0) / caps.length
  return { u, v }
})()

const MAX_R = Math.max(
  ...Object.values(CAP_UV).map((p) => Math.hypot(p.u - CENTROID.u, p.v - CENTROID.v)),
)

// Cap positions for plotting/scoring: u'v' centred on the cluster centroid and scaled
// so the farthest cap sits on the unit circle. y points up (v'); the SVG flips it.
export const D15_POSITIONS: Record<number, D15Point> = Object.fromEntries(
  Object.entries(CAP_UV).map(([key, p]) => {
    const index = Number(key)
    const x = Number(((p.u - CENTROID.u) / MAX_R).toFixed(6))
    const y = Number(((p.v - CENTROID.v) / MAX_R).toFixed(6))
    return [index, { x, y, angleDeg: normalizeAngle((Math.atan2(y, x) * 180) / Math.PI), index }]
  }),
) as Record<number, D15Point>

function axisAngleFromCopunctal(cop: { x: number; y: number }): number {
  const c = xyToUv(cop.x, cop.y)
  const dx = CENTROID.u - c.u
  const dy = CENTROID.v - c.v
  return Number(normalizeLineAngle((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(2))
}

// Derived confusion-axis directions (degrees, y-up) IN REAL u'v' SPACE — used for
// scoring/classification. Protan ≈ 4°, Deutan ≈ 167.5° (the two run nearly parallel —
// hard to separate, as in the real test), Tritan ≈ 97.5°.
export const CONFUSION_AXES: Record<Exclude<D15Axis, 'normal'>, { angleDeg: number; label: string }> = {
  protan: { angleDeg: axisAngleFromCopunctal(COPUNCTAL_XY.protan), label: 'Protan' },
  deutan: { angleDeg: axisAngleFromCopunctal(COPUNCTAL_XY.deutan), label: 'Deutan' },
  tritan: { angleDeg: axisAngleFromCopunctal(COPUNCTAL_XY.tritan), label: 'Tritan' },
}

// ---------------------------------------------------------------------------
// Display layer (schematic circle, matches the printed worksheet)
// ---------------------------------------------------------------------------
// Evenly-spaced circle for DISPLAY ONLY: pilot at the left (180°), caps 1..15
// clockwise — the familiar Farnsworth worksheet layout. Scoring still uses the real
// u'v' positions above; this only changes how the diagram looks.
export const D15_DISPLAY_POSITIONS: Record<number, D15Point> = Object.fromEntries(
  Array.from({ length: 16 }, (_, index) => {
    const angleDeg = normalizeAngle(180 - index * 22.5)
    const rad = (angleDeg * Math.PI) / 180
    return [index, { x: Number(Math.cos(rad).toFixed(6)), y: Number(Math.sin(rad).toFixed(6)), angleDeg, index }]
  }),
) as Record<number, D15Point>

// Confusion-axis directions projected onto the schematic circle: anchor each axis to
// the two caps at the extreme ends of the real confusion direction, then connect their
// schematic positions. This keeps each defect's red crossing lines visually parallel to
// its own displayed axis. Protan ≈ 146°, Deutan ≈ 90° (vertical), Tritan ≈ 11° (horizontal).
function displayAxisFromCopunctal(cop: { x: number; y: number }): number {
  const c = xyToUv(cop.x, cop.y)
  const dx = CENTROID.u - c.u
  const dy = CENTROID.v - c.v
  const mag = Math.hypot(dx, dy) || 1
  const ux = dx / mag
  const uy = dy / mag
  let max = -Infinity
  let min = Infinity
  let iMax = 0
  let iMin = 0
  for (let i = 0; i < 16; i += 1) {
    const proj = D15_POSITIONS[i].x * ux + D15_POSITIONS[i].y * uy
    if (proj > max) { max = proj; iMax = i }
    if (proj < min) { min = proj; iMin = i }
  }
  const a = D15_DISPLAY_POSITIONS[iMax]
  const b = D15_DISPLAY_POSITIONS[iMin]
  return Number(normalizeLineAngle((Math.atan2(a.y - b.y, a.x - b.x) * 180) / Math.PI).toFixed(2))
}

export const CONFUSION_AXES_DISPLAY: Record<Exclude<D15Axis, 'normal'>, { angleDeg: number; label: string }> = {
  protan: { angleDeg: displayAxisFromCopunctal(COPUNCTAL_XY.protan), label: 'Protan' },
  deutan: { angleDeg: displayAxisFromCopunctal(COPUNCTAL_XY.deutan), label: 'Deutan' },
  tritan: { angleDeg: displayAxisFromCopunctal(COPUNCTAL_XY.tritan), label: 'Tritan' },
}

export function isCompleteD15Order(order: number[]): boolean {
  return order.length === 15 && new Set(order).size === 15 && order.every((cap) => cap >= 1 && cap <= 15)
}

export function scoreD15(order: number[]): D15Result {
  if (!isCompleteD15Order(order)) {
    throw new Error('D-15 order must be a complete permutation of caps 1-15')
  }

  const path = [0, ...order]
  const segments = path.slice(1).map((to, index) => {
    const from = path[index]
    const gap = circularGap(from, to)
    const isCrossing = gap > CROSSING_GAP_THRESHOLD
    return {
      from,
      to,
      isCrossing,
      axis: isCrossing ? nearestAxis(segmentAngle(from, to)) : null,
    }
  })

  const crossings = segments.filter((segment) => segment.isCrossing).length
  const pass = crossings <= PASS_MAX_CROSSINGS
  const axis = pass ? 'normal' : majorityAxis(segments)

  return {
    crossings,
    axis,
    pass,
    segments,
    summary: formatD15Summary({ crossings, axis, pass }),
  }
}

export function formatD15Summary(result: Pick<D15Result, 'crossings' | 'axis' | 'pass'>): string {
  const status = result.pass ? 'Pass' : 'Fail'
  const axis = result.axis === 'normal' ? 'Normal' : CONFUSION_AXES[result.axis].label
  const unit = result.crossings === 1 ? 'crossing' : 'crossings'
  return `${status} - ${axis} (${result.crossings} ${unit})`
}

// Caps 0..15 sit on a closed loop in hue order, so a transposition is still measured
// by how many cap-index steps a segment skips (independent of the exact geometry).
function circularGap(a: number, b: number): number {
  const direct = Math.abs(a - b)
  return Math.min(direct, 16 - direct)
}

function segmentAngle(from: number, to: number): number {
  const a = D15_POSITIONS[from]
  const b = D15_POSITIONS[to]
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
  return normalizeLineAngle(angle)
}

function nearestAxis(angleDeg: number): Exclude<D15Axis, 'normal'> {
  return (Object.keys(CONFUSION_AXES) as Exclude<D15Axis, 'normal'>[]).reduce((best, axis) => {
    const currentDiff = lineAngleDiff(angleDeg, CONFUSION_AXES[axis].angleDeg)
    const bestDiff = lineAngleDiff(angleDeg, CONFUSION_AXES[best].angleDeg)
    return currentDiff < bestDiff ? axis : best
  }, 'protan')
}

function majorityAxis(segments: D15Segment[]): Exclude<D15Axis, 'normal'> {
  const counts: Record<Exclude<D15Axis, 'normal'>, number> = { protan: 0, deutan: 0, tritan: 0 }
  for (const segment of segments) {
    if (segment.axis) counts[segment.axis] += 1
  }

  return (Object.keys(counts) as Exclude<D15Axis, 'normal'>[]).reduce((best, axis) => {
    if (counts[axis] > counts[best]) return axis
    if (counts[axis] === counts[best]) {
      return CONFUSION_AXES[axis].angleDeg < CONFUSION_AXES[best].angleDeg ? axis : best
    }
    return best
  }, 'protan')
}

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360
}

function normalizeLineAngle(angle: number): number {
  return ((angle % 180) + 180) % 180
}

function lineAngleDiff(a: number, b: number): number {
  const diff = Math.abs(normalizeLineAngle(a) - normalizeLineAngle(b))
  return Math.min(diff, 180 - diff)
}
