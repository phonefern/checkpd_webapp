export type D15Axis = 'normal' | 'protan' | 'deutan' | 'tritan'
export type D15Severity = 'normal' | 'mild' | 'moderate' | 'severe'

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

export const SEVERITY_THRESHOLDS: Record<Exclude<D15Severity, 'normal'>, number> = {
  mild: PASS_MAX_CROSSINGS + 1,
  moderate: PASS_MAX_CROSSINGS + 4,
  severe: PASS_MAX_CROSSINGS + 7,
}

const SEVERITY_TH: Record<D15Severity, string> = {
  normal: 'ปกติ',
  mild: 'ระดับเล็กน้อย',
  moderate: 'ระดับปานกลาง',
  severe: 'ระดับรุนแรง',
}

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

export const D15_REFERENCE_SOURCES = [
  {
    label: 'Farnsworth D-15 cap chromaticities',
    citation: 'Farnsworth D. The Farnsworth Dichotomous Test for Color Blindness Panel D-15 Manual. Psychological Corp.; 1947.',
    url: 'https://cran.r-project.org/web/packages/CVD/refman/CVD.html',
    note: 'CIE x,y cap data used for geometry and approximate swatches; CRAN CVD documents the FarnsworthD15 dataset source.',
  },
  {
    label: 'Quantitative D-15 scoring method',
    citation: 'Vingrys AJ, King-Smith PE. A quantitative scoring technique for panel tests of color vision. Invest Ophthalmol Vis Sci. 1988.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/3257208/',
    note: 'Reference for confusion angle / total error score concepts. This app intentionally keeps the paper-style crossing-count method.',
  },
  {
    label: 'D-15 pass-rate evidence',
    citation: 'Birch J. Pass rates for the Farnsworth D15 colour vision test. Ophthalmic Physiol Opt. 2008.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/18426425/',
    note: 'Supports treating permitted red-green crossings as a pass/fail policy choice; local thresholds remain doctor-owned constants.',
  },
  {
    label: 'External implementation comparison',
    citation: 'Colorlite online Farnsworth D-15 reference implementation.',
    url: 'https://www.colorlitelens.com/images/test/D15/D15.html',
    note: 'Used only as a UI/wording comparison for a plain-language diagnosis line, not as the clinical source of truth.',
  },
] as const

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

const SWATCH_ASSUMED_Y = 0.19

export function capSwatchHex(cap: number): string {
  const chromaticity = CAP_XY[cap]
  if (!chromaticity) throw new Error(`Unknown D-15 cap: ${cap}`)

  const { x, y } = chromaticity
  const Y = SWATCH_ASSUMED_Y
  const X = (Y / y) * x
  const Z = (Y / y) * (1 - x - y)

  const toSrgb = (c: number) => {
    const clamped = Math.min(1, Math.max(0, c))
    const gamma = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, gamma)) * 255)
  }

  const r = toSrgb(3.2406 * X - 1.5372 * Y - 0.4986 * Z)
  const g = toSrgb(-0.9689 * X + 1.8758 * Y + 0.0415 * Z)
  const b = toSrgb(0.0557 * X - 0.2040 * Y + 1.0570 * Z)

  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export const CAP_SWATCH: Record<number, string> = Object.fromEntries(
  Object.keys(CAP_XY).map((cap) => [Number(cap), capSwatchHex(Number(cap))]),
) as Record<number, string>

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
// Display layer (real geometry, re-oriented to the familiar worksheet layout)
// ---------------------------------------------------------------------------
// Same real u'v' positions as D15_POSITIONS (used for scoring above) — NOT an
// evenly-spaced schematic circle. The real cap loop is irregular (caps sit at varying
// radii, matching the classic printed D-15 score sheet which is also not a perfect
// circle). We only apply a rigid rotation so the pilot (index 0) lands on the left,
// matching the worksheet's familiar orientation — this changes nothing about shape,
// spacing, or scoring, only which way "up" is drawn.
const DISPLAY_ROTATION_DEG = 180 - D15_POSITIONS[0].angleDeg

export const D15_DISPLAY_POSITIONS: Record<number, D15Point> = Object.fromEntries(
  Object.entries(D15_POSITIONS).map(([key, p]) => {
    const index = Number(key)
    const rad = (DISPLAY_ROTATION_DEG * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const x = Number((p.x * cos - p.y * sin).toFixed(6))
    const y = Number((p.x * sin + p.y * cos).toFixed(6))
    return [index, { x, y, angleDeg: normalizeAngle((Math.atan2(y, x) * 180) / Math.PI), index }]
  }),
) as Record<number, D15Point>

// Confusion-axis directions in display space: since the display layer is now just a
// rotation of the real geometry (not a distorted schematic), this anchors each axis to
// the two caps at the extreme ends of the real confusion direction and connects their
// (rotated) display positions — which lands exactly on the real axis angle, rotated.
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

export function classifyD15Severity(crossings: number): D15Severity {
  if (crossings <= PASS_MAX_CROSSINGS) return 'normal'
  if (crossings < SEVERITY_THRESHOLDS.moderate) return 'mild'
  if (crossings < SEVERITY_THRESHOLDS.severe) return 'moderate'
  return 'severe'
}

export function describeD15Severity(result: Pick<D15Result, 'crossings' | 'axis' | 'pass'>): string {
  const severity = classifyD15Severity(result.crossings)
  if (result.pass) return `ปกติ (${result.crossings} เส้นตัด)`

  const axisLabel = result.axis === 'normal' ? 'Normal' : CONFUSION_AXES[result.axis].label
  return `ผิดปกติ - ${axisLabel} ${SEVERITY_TH[severity]} (${result.crossings} เส้นตัด)`
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
