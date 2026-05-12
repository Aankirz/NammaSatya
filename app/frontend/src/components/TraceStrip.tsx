'use client'

import { PIPELINE_STEPS } from '@/lib/constants'

interface Props {
  completedMs: number[]
}

export default function TraceStrip({ completedMs }: Props) {
  const total = completedMs.reduce((a, b) => a + b, 0)
  return (
    <div className="trace">
      <b>Trace</b>
      {PIPELINE_STEPS.map((s, i) => (
        <span key={s.id}>
          <span className="trace-hot">{s.label.toLowerCase()}</span>
          {' '}{completedMs[i] ?? 0}ms ·
        </span>
      ))}
      <span className="trace-tot">{total} ms total</span>
    </div>
  )
}
