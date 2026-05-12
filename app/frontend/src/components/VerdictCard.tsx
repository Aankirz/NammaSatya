'use client'

import { useState, useEffect } from 'react'
import type { Verdict, VerdictTreatment } from '@/types'

interface Props {
  verdict: Verdict
  confidence: number
  summary: string
  treatment?: VerdictTreatment
}

export default function VerdictCard({ verdict, confidence, summary, treatment = 'confident' }: Props) {
  const [fill, setFill] = useState(0)

  useEffect(() => {
    setFill(0)
    const t = setTimeout(() => setFill(confidence), 80)
    return () => clearTimeout(t)
  }, [confidence])

  const pct = Math.round(confidence * 100)

  if (treatment === 'loud') {
    return (
      <div className="verdict verdict-loud" data-tone={verdict}>
        <div className="vdl-top">
          <div className="vdl-eye">Verdict</div>
          <div className="vdl-word">{verdict}</div>
          <div className="vdl-track"><i style={{ transform: `scaleX(${fill})` }} /></div>
          <div className="vdl-cf"><b>{pct}%</b> confidence</div>
        </div>
        <div className="vdl-summary">{summary}</div>
      </div>
    )
  }

  if (treatment === 'restrained') {
    return (
      <div className="verdict verdict-restrained" data-tone={verdict}>
        <div className="vdr-row">
          <span className="vdr-tag"><i />{verdict}</span>
          <span className="vdr-cf">confidence <b>{pct}%</b></span>
        </div>
        <div className="vdr-summary">{summary}</div>
      </div>
    )
  }

  // default: confident
  return (
    <div className="verdict verdict-confident" data-tone={verdict}>
      <div className="vd-row">
        <span className="vd-stamp"><i />{verdict}</span>
        <span className="vd-cf"><b>{pct}%</b> confidence</span>
      </div>
      <div className="vd-summary">{summary}</div>
      <div className="vd-track"><i style={{ transform: `scaleX(${fill})` }} /></div>
    </div>
  )
}
