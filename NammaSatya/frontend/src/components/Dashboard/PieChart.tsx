'use client'

import type { Verdict } from '@/types'

const VERDICT_FILL: Record<Verdict, string> = {
  SUPPORTED:  'var(--v-sup)',
  REFUTED:    'var(--v-ref)',
  UNVERIFIED: 'var(--v-unv)',
  MANGLED:    'var(--v-man)',
}

interface Segment { v: Verdict; n: number; pct: number }

interface Props {
  data: Segment[]
  size?: number
}

export default function PieChart({ data, size = 148 }: Props) {
  const cx = size / 2, cy = size / 2
  const r  = size / 2 - 6
  const ir = r * 0.62
  let acc  = 0

  const segs = data.map((d) => {
    const start = acc, end = acc + d.pct
    acc = end
    const a0 = start * Math.PI * 2 - Math.PI / 2
    const a1 = end   * Math.PI * 2 - Math.PI / 2
    const large  = d.pct > 0.5 ? 1 : 0
    const x0  = cx + r  * Math.cos(a0), y0  = cy + r  * Math.sin(a0)
    const x1  = cx + r  * Math.cos(a1), y1  = cy + r  * Math.sin(a1)
    const xi0 = cx + ir * Math.cos(a0), yi0 = cy + ir * Math.sin(a0)
    const xi1 = cx + ir * Math.cos(a1), yi1 = cy + ir * Math.sin(a1)
    const path = [
      `M ${x0} ${y0}`,
      `A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`,
      `L ${xi1} ${yi1}`,
      `A ${ir} ${ir} 0 ${large} 0 ${xi0} ${yi0}`,
      'Z',
    ].join(' ')
    return { ...d, path }
  })

  const total = data.reduce((a, b) => a + b.n, 0)

  return (
    <svg className="pie-svg" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {segs.map((s) => (
        <path key={s.v} d={s.path}
          fill={VERDICT_FILL[s.v]}
          stroke="var(--card)" strokeWidth="2" />
      ))}
      <text x={cx} y={cy - 2} textAnchor="middle"
        fontFamily="var(--font-jakarta)"
        fontSize="22" fontWeight="700" fill="var(--ink)"
        style={{ letterSpacing: '-.02em' }}>
        {total.toLocaleString()}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle"
        fontFamily="var(--font-jakarta)"
        fontSize="9" fontWeight="600" letterSpacing="1.4" fill="var(--ink-3)">
        TOTAL
      </text>
    </svg>
  )
}
