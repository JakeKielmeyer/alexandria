// Pure geometry helpers for speech-bubble tail construction.
// No React, no project imports — just math.

export interface Point {
  x: number
  y: number
}

export interface BubbleState {
  x: number
  y: number
  width: number
  height: number
  rx: number
  ry: number
}

// ---------------------------------------------------------------------------
// Vector helpers
// ---------------------------------------------------------------------------

function lengthP(p: Point): number {
  return Math.sqrt(p.x * p.x + p.y * p.y)
}

export function normalize(v: Point): Point {
  const m = lengthP(v)
  if (m < 1e-12) return { x: 0, y: 1 }
  return { x: v.x / m, y: v.y / m }
}

export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}

export function addP(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function subP(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scaleP(p: Point, s: number): Point {
  return { x: p.x * s, y: p.y * s }
}

// ---------------------------------------------------------------------------
// Ray / segment / arc intersections
// ---------------------------------------------------------------------------

export function raySegmentIntersect(
  origin: Point,
  dir: Point,
  a: Point,
  b: Point,
): number | null {
  const bx = b.x - a.x
  const by = b.y - a.y
  const denom = dir.x * by - dir.y * bx
  if (Math.abs(denom) < 1e-10) return null

  const ox = a.x - origin.x
  const oy = a.y - origin.y
  const t = (ox * by - oy * bx) / denom
  const s = (ox * dir.y - oy * dir.x) / denom

  if (t >= -1e-6 && s >= -1e-6 && s <= 1 + 1e-6) return t
  return null
}

export function rayArcIntersect(
  origin: Point,
  dir: Point,
  center: Point,
  r: number,
  startAngle: number,
  endAngle: number,
): number | null {
  const d: Point = { x: origin.x - center.x, y: origin.y - center.y }
  const aCoef = dot(dir, dir)
  const bCoef = 2 * dot(d, dir)
  const cCoef = dot(d, d) - r * r

  const disc = bCoef * bCoef - 4 * aCoef * cCoef
  if (disc < 0) return null

  const sqrtDisc = Math.sqrt(disc)
  const t1 = (-bCoef - sqrtDisc) / (2 * aCoef)
  const t2 = (-bCoef + sqrtDisc) / (2 * aCoef)

  const TWO_PI = Math.PI * 2
  const norm = (a: number) => ((a % TWO_PI) + TWO_PI) % TWO_PI
  const sA = norm(startAngle)
  const eA = norm(endAngle)

  const inRange = (angle: number): boolean => {
    const a = norm(angle)
    if (sA <= eA) {
      return a >= sA - 1e-6 && a <= eA + 1e-6
    }
    return a >= sA - 1e-6 || a <= eA + 1e-6
  }

  const candidates: number[] = []
  for (const t of [t1, t2]) {
    if (t < -1e-6) continue
    const px = origin.x + dir.x * t
    const py = origin.y + dir.y * t
    const ang = Math.atan2(py - center.y, px - center.x)
    if (inRange(ang)) candidates.push(t)
  }

  if (candidates.length === 0) return null
  return Math.min(...candidates)
}

// ---------------------------------------------------------------------------
// Point-in-rounded-rect
// ---------------------------------------------------------------------------

function isInsideBubble(p: Point, bubble: BubbleState): boolean {
  const cx = bubble.x + bubble.width / 2
  const cy = bubble.y + bubble.height / 2
  const ax = Math.abs(p.x - cx)
  const ay = Math.abs(p.y - cy)
  const hw = bubble.width / 2
  const hh = bubble.height / 2

  if (ax > hw || ay > hh) return false
  if (ax > hw - bubble.rx && ay > hh - bubble.ry) {
    const ddx = ax - (hw - bubble.rx)
    const ddy = ay - (hh - bubble.ry)
    return ddx * ddx + ddy * ddy <= bubble.rx * bubble.rx
  }
  return true
}

// ---------------------------------------------------------------------------
// Perimeter tangent (CW direction in screen coords, Y-down)
// ---------------------------------------------------------------------------

export function perimeterTangent(base: Point, bubble: BubbleState): Point {
  const { x, y, width: w, height: h, rx, ry } = bubble

  const corners = [
    {
      cx: x + rx,
      cy: y + ry,
      check: (p: Point) => p.x < x + rx && p.y < y + ry,
    },
    {
      cx: x + w - rx,
      cy: y + ry,
      check: (p: Point) => p.x > x + w - rx && p.y < y + ry,
    },
    {
      cx: x + w - rx,
      cy: y + h - ry,
      check: (p: Point) => p.x > x + w - rx && p.y > y + h - ry,
    },
    {
      cx: x + rx,
      cy: y + h - ry,
      check: (p: Point) => p.x < x + rx && p.y > y + h - ry,
    },
  ]

  for (const corner of corners) {
    if (corner.check(base)) {
      const radius = normalize({
        x: base.x - corner.cx,
        y: base.y - corner.cy,
      })
      // CW perpendicular to outward radius: (-ry, rx)
      return { x: -radius.y, y: radius.x }
    }
  }

  if (base.y <= y + ry) return { x: 1, y: 0 } // top
  if (base.x >= x + w - rx) return { x: 0, y: 1 } // right
  if (base.y >= y + h - ry) return { x: -1, y: 0 } // bottom
  return { x: 0, y: -1 } // left
}

// ---------------------------------------------------------------------------
// Nearest perimeter point (used when tip is inside the bubble)
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function nearestPerimeterPoint(
  tip: Point,
  bubble: BubbleState,
): { base: Point; tangent: Point } {
  const { x, y, width: w, height: h, rx, ry } = bubble

  const candidates: { pt: Point; distSq: number }[] = []

  // Straight edges (clamp projection to the segment between corner arcs)
  const edges: [Point, Point][] = [
    [{ x: x + rx, y }, { x: x + w - rx, y }],
    [{ x: x + w, y: y + ry }, { x: x + w, y: y + h - ry }],
    [{ x: x + w - rx, y: y + h }, { x: x + rx, y: y + h }],
    [{ x, y: y + h - ry }, { x, y: y + ry }],
  ]
  for (const [a, b] of edges) {
    const ex = b.x - a.x
    const ey = b.y - a.y
    const len2 = ex * ex + ey * ey
    let t = 0
    if (len2 > 1e-12) {
      t = ((tip.x - a.x) * ex + (tip.y - a.y) * ey) / len2
      t = clamp(t, 0, 1)
    }
    const pt: Point = { x: a.x + ex * t, y: a.y + ey * t }
    const dx = tip.x - pt.x
    const dy = tip.y - pt.y
    candidates.push({ pt, distSq: dx * dx + dy * dy })
  }

  // Corner arcs
  const PI = Math.PI
  const arcs: {
    center: Point
    startAngle: number
    endAngle: number
  }[] = [
    {
      center: { x: x + rx, y: y + ry },
      startAngle: PI,
      endAngle: (3 * PI) / 2,
    },
    {
      center: { x: x + w - rx, y: y + ry },
      startAngle: (3 * PI) / 2,
      endAngle: 2 * PI,
    },
    {
      center: { x: x + w - rx, y: y + h - ry },
      startAngle: 0,
      endAngle: PI / 2,
    },
    {
      center: { x: x + rx, y: y + h - ry },
      startAngle: PI / 2,
      endAngle: PI,
    },
  ]

  const TWO_PI = 2 * PI
  const norm = (a: number) => ((a % TWO_PI) + TWO_PI) % TWO_PI

  for (const arc of arcs) {
    const dx = tip.x - arc.center.x
    const dy = tip.y - arc.center.y
    const len = Math.sqrt(dx * dx + dy * dy)
    let ux: number
    let uy: number
    if (len < 1e-12) {
      ux = Math.cos(arc.startAngle)
      uy = Math.sin(arc.startAngle)
    } else {
      ux = dx / len
      uy = dy / len
    }
    let ang = Math.atan2(uy, ux)
    const sA = norm(arc.startAngle)
    const eA = norm(arc.endAngle)
    const a = norm(ang)

    let inRange: boolean
    if (sA <= eA) {
      inRange = a >= sA - 1e-9 && a <= eA + 1e-9
    } else {
      inRange = a >= sA - 1e-9 || a <= eA + 1e-9
    }

    if (!inRange) {
      // Clamp to nearest endpoint of the arc
      const distToStart = Math.min(
        Math.abs(a - sA),
        TWO_PI - Math.abs(a - sA),
      )
      const distToEnd = Math.min(
        Math.abs(a - eA),
        TWO_PI - Math.abs(a - eA),
      )
      ang = distToStart < distToEnd ? arc.startAngle : arc.endAngle
      ux = Math.cos(ang)
      uy = Math.sin(ang)
    }

    const pt: Point = {
      x: arc.center.x + ux * rx,
      y: arc.center.y + uy * ry,
    }
    const ddx = tip.x - pt.x
    const ddy = tip.y - pt.y
    candidates.push({ pt, distSq: ddx * ddx + ddy * ddy })
  }

  let best = candidates[0]
  for (const c of candidates) {
    if (c.distSq < best.distSq) best = c
  }

  return { base: best.pt, tangent: perimeterTangent(best.pt, bubble) }
}

// ---------------------------------------------------------------------------
// computeBasePoint — main exported entry point
// ---------------------------------------------------------------------------

export function computeBasePoint(
  tip: Point,
  bubble: BubbleState,
): { base: Point; tangent: Point } {
  // Degenerate bubble fallback
  if (bubble.width <= 0 || bubble.height <= 0) {
    return {
      base: { x: bubble.x, y: bubble.y },
      tangent: { x: 1, y: 0 },
    }
  }

  const center: Point = {
    x: bubble.x + bubble.width / 2,
    y: bubble.y + bubble.height / 2,
  }

  if (isInsideBubble(tip, bubble)) {
    return nearestPerimeterPoint(tip, bubble)
  }

  const dir = normalize({ x: center.x - tip.x, y: center.y - tip.y })
  const { x, y, width: w, height: h, rx, ry } = bubble

  const candidates: { t: number; pt: Point }[] = []

  // Straight edges (only the portions between corner arcs)
  const edges: [Point, Point][] = [
    [{ x: x + rx, y }, { x: x + w - rx, y }], // top
    [
      { x: x + w, y: y + ry },
      { x: x + w, y: y + h - ry },
    ], // right
    [
      { x: x + w - rx, y: y + h },
      { x: x + rx, y: y + h },
    ], // bottom
    [
      { x, y: y + h - ry },
      { x, y: y + ry },
    ], // left
  ]
  for (const [a, b] of edges) {
    const t = raySegmentIntersect(tip, dir, a, b)
    if (t !== null && t >= -1e-6) {
      const pt: Point = { x: tip.x + dir.x * t, y: tip.y + dir.y * t }
      candidates.push({ t, pt })
    }
  }

  // Corner arcs (Y-down screen coords, atan2 convention)
  const PI = Math.PI
  const arcs: {
    center: Point
    startAngle: number
    endAngle: number
  }[] = [
    {
      center: { x: x + rx, y: y + ry },
      startAngle: PI,
      endAngle: (3 * PI) / 2,
    },
    {
      center: { x: x + w - rx, y: y + ry },
      startAngle: (3 * PI) / 2,
      endAngle: 2 * PI,
    },
    {
      center: { x: x + w - rx, y: y + h - ry },
      startAngle: 0,
      endAngle: PI / 2,
    },
    {
      center: { x: x + rx, y: y + h - ry },
      startAngle: PI / 2,
      endAngle: PI,
    },
  ]
  for (const arc of arcs) {
    const t = rayArcIntersect(
      tip,
      dir,
      arc.center,
      rx,
      arc.startAngle,
      arc.endAngle,
    )
    if (t !== null && t >= -1e-6) {
      const pt: Point = { x: tip.x + dir.x * t, y: tip.y + dir.y * t }
      candidates.push({ t, pt })
    }
  }

  if (candidates.length === 0) {
    return nearestPerimeterPoint(tip, bubble)
  }

  let best = candidates[0]
  for (const c of candidates) {
    if (c.t < best.t) best = c
  }

  return {
    base: best.pt,
    tangent: perimeterTangent(best.pt, bubble),
  }
}

// ---------------------------------------------------------------------------
// buildTailPath — SVG cubic Bezier wedge from base → tip → base
// ---------------------------------------------------------------------------

export function buildTailPath(
  base: Point,
  tangent: Point,
  tip: Point,
  halfWidth: number,
  curvature: number,
): string {
  // Ensure tangent is unit length; if degenerate, fall back to a horizontal axis
  const tLen = lengthP(tangent)
  const tan: Point =
    tLen < 1e-9 ? { x: 1, y: 0 } : { x: tangent.x / tLen, y: tangent.y / tLen }

  // Outward normal — flip so it points from base toward tip
  let perp: Point = { x: -tan.y, y: tan.x }
  const toTip: Point = { x: tip.x - base.x, y: tip.y - base.y }
  if (dot(perp, toTip) < 0) {
    perp = { x: tan.y, y: -tan.x }
  }

  const baseLeft: Point = {
    x: base.x - tan.x * halfWidth,
    y: base.y - tan.y * halfWidth,
  }
  const baseRight: Point = {
    x: base.x + tan.x * halfWidth,
    y: base.y + tan.y * halfWidth,
  }

  const blend = curvature * halfWidth * 2
  const c1: Point = {
    x: baseLeft.x + perp.x * blend,
    y: baseLeft.y + perp.y * blend,
  }
  const c2: Point = {
    x: tip.x - perp.x * blend * 0.3,
    y: tip.y - perp.y * blend * 0.3,
  }
  const c3: Point = {
    x: tip.x - perp.x * blend * 0.3,
    y: tip.y - perp.y * blend * 0.3,
  }
  const c4: Point = {
    x: baseRight.x + perp.x * blend,
    y: baseRight.y + perp.y * blend,
  }

  const fmt = (n: number) => Math.round(n * 100) / 100

  return [
    `M ${fmt(baseLeft.x)} ${fmt(baseLeft.y)}`,
    `C ${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(tip.x)} ${fmt(tip.y)}`,
    `C ${fmt(c3.x)} ${fmt(c3.y)} ${fmt(c4.x)} ${fmt(c4.y)} ${fmt(baseRight.x)} ${fmt(baseRight.y)}`,
    'Z',
  ].join(' ')
}
