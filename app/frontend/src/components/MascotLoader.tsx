'use client'

import { useState, useEffect } from 'react'
import Mascot from './Mascot'
import { PIPELINE_STEPS, STEP_LABELS } from '@/lib/constants'

interface Props {
  stepIdx: number
  completedMs: number[]
  isInjection: boolean
}

export default function MascotLoader({ stepIdx, completedMs, isInjection }: Props) {
  const [blink, setBlink] = useState(false)
  const [scan,  setScan]  = useState(true)

  useEffect(() => {
    let alive = true
    const bTick = () => {
      if (!alive) return
      setBlink(true)
      setTimeout(() => alive && setBlink(false), 140)
    }
    const b = setInterval(bTick, 2400)
    const h = setInterval(() => setScan((v) => !v), 900)
    return () => { alive = false; clearInterval(b); clearInterval(h) }
  }, [])

  const total    = PIPELINE_STEPS.length
  const progress = Math.min((stepIdx + 0.4) / total, 1)
  const elapsed  = completedMs.reduce((a, b) => a + b, 0)
  const curStep  = PIPELINE_STEPS[Math.min(stepIdx, total - 1)]

  const label = isInjection && curStep.id === 'sanitise'
    ? 'Stripping injection patterns'
    : STEP_LABELS[curStep.id] ?? curStep.label

  return (
    <div className="mascot">
      <Mascot blink={blink} scan={scan} />
      <div className="mascot-line">
        <b>Satya is on it…</b><br />{label}
      </div>
      <div className="mascot-prog">
        <i style={{ transform: `scaleX(${progress})` }} />
      </div>
      <div className="mascot-step-meta">
        step {Math.min(stepIdx + 1, total)} / {total} · {elapsed} ms
      </div>
    </div>
  )
}
