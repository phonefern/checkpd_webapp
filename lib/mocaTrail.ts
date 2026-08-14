// Trail Making dot layout — shared so the canvas (component) and the SVG/PDF
// renderer draw the exact same dots. Sequence order = array order:
// 1 → ก → 2 → ข → 3 → ค → 4 → ง → 5 → จ (start = 1, end = จ). Matches the paper.

export type TrailDot = { label: string; x: number; y: number }

export const TRAIL_W = 720
export const TRAIL_H = 440
export const TRAIL_DOT_R = 24

export const TRAIL_DOTS: TrailDot[] = [
  { label: '1', x: 240, y: 205 }, { label: 'ก', x: 495, y: 70 },
  { label: '2', x: 620, y: 160 }, { label: 'ข', x: 440, y: 165 },
  { label: '3', x: 615, y: 320 }, { label: 'ค', x: 230, y: 385 },
  { label: '4', x: 385, y: 295 }, { label: 'ง', x: 110, y: 290 },
  { label: '5', x: 85, y: 145 }, { label: 'จ', x: 250, y: 70 },
]

const FONT = "'Segoe UI','Sarabun',sans-serif"

// Example guide arrows (dashed) for the first two connections 1→ก, ก→2,
// as printed on the MoCA sheet.
const TRAIL_GUIDE: [string, string][] = [
  ['1', 'ก'],
  ['ก', '2'],
]

function guideArrowSvg(a: TrailDot, b: TrailDot): string {
  const HEAD = 11
  const HALF = 6
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const pad = TRAIL_DOT_R + 4
  const x1 = a.x + ux * pad
  const y1 = a.y + uy * pad
  const x2 = b.x - ux * pad // tip at edge of dot b
  const y2 = b.y - uy * pad
  const bx = x2 - ux * HEAD // arrowhead base
  const by = y2 - uy * HEAD
  const px = -uy
  const py = ux
  const line = `<line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5" stroke-linecap="round"/>`
  const head = `<polygon points="${x2},${y2} ${bx + px * HALF},${by + py * HALF} ${bx - px * HALF},${by - py * HALF}" fill="#94a3b8"/>`
  return line + head
}

/** The Trail dots + example arrows + start/end markers as SVG (behind strokes). */
export function trailDotsSvg(): string {
  const guides = TRAIL_GUIDE.map(([af, bf]) => {
    const a = TRAIL_DOTS.find((d) => d.label === af)
    const b = TRAIL_DOTS.find((d) => d.label === bf)
    return a && b ? guideArrowSvg(a, b) : ''
  }).join('')

  const circles = TRAIL_DOTS.map(
    (d) =>
      `<circle cx="${d.x}" cy="${d.y}" r="${TRAIL_DOT_R}" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>` +
      `<text x="${d.x}" y="${d.y}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-size="20" font-weight="700" fill="#1e293b">${d.label}</text>`,
  ).join('')

  const start = TRAIL_DOTS.find((d) => d.label === '1')
  const end = TRAIL_DOTS.find((d) => d.label === 'จ')
  const mark = (d: TrailDot | undefined, text: string) =>
    d
      ? `<text x="${d.x}" y="${d.y + 40}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-size="13" font-weight="600" fill="#94a3b8">${text}</text>`
      : ''

  return guides + circles + mark(start, 'จุดเริ่มต้น') + mark(end, 'จุดสิ้นสุด')
}
