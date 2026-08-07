// Shared stroke model for the MoCA Visuospatial drawing tasks.
// The drawing is stored as vector data (JSONB), NOT an image. From this single
// source we can render to a <canvas> (edit / replay) or to an SVG string
// (read-only view + PDF) on demand — nothing rendered is ever persisted.

export type StrokePoint = [number, number] // [x, y] in the canvas's own coord space
export type Stroke = { pts: StrokePoint[] }

export interface StrokeData {
  v: number // format version (bump when the shape changes)
  w: number // source canvas width  (for scaling on render)
  h: number // source canvas height
  strokes: Stroke[]
}

export const STROKE_VERSION = 1

export function emptyStrokes(w: number, h: number): StrokeData {
  return { v: STROKE_VERSION, w, h, strokes: [] }
}

export function isEmptyStrokes(data: StrokeData | null | undefined): boolean {
  return !data || data.strokes.every((s) => s.pts.length === 0)
}

/** Paint the given strokes onto a 2D canvas context (used for live draw + replay). */
export function drawStrokesOnCtx(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  opts: { color: string; width: number },
): void {
  ctx.strokeStyle = opts.color
  ctx.fillStyle = opts.color
  ctx.lineWidth = opts.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of strokes) {
    const pts = s.pts
    if (pts.length === 0) continue
    if (pts.length === 1) {
      // a single tap → a dot
      ctx.beginPath()
      ctx.arc(pts[0][0], pts[0][1], opts.width / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.stroke()
  }
}

/**
 * Render strokes to a standalone SVG string (for read-only view + PDF).
 * `prepend` is raw SVG placed behind the strokes (e.g. Trail Making dots).
 */
export function strokesToSvg(
  data: StrokeData | null | undefined,
  opts?: { color?: string; width?: number; background?: string; prepend?: string },
): string {
  const color = opts?.color ?? '#1e3a8a'
  const width = opts?.width ?? 3
  const w = data?.w ?? 720
  const h = data?.h ?? 440
  const bg = opts?.background ? `<rect width="${w}" height="${h}" fill="${opts.background}"/>` : ''
  const behind = opts?.prepend ?? ''
  const polylines = (data?.strokes ?? [])
    .filter((s) => s.pts.length > 0)
    .map((s) => {
      const points = s.pts.map((p) => `${p[0]},${p[1]}`).join(' ')
      return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${bg}${behind}${polylines}</svg>`
}
