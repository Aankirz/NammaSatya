'use client'

import { useState, useRef, useCallback } from 'react'
import type { CheckResponse } from '@/types'
import { checkClaim } from '@/lib/api'
import { PIPELINE_STEPS, SAMPLE_CLAIMS, INJECTION_CLAIM, INJECTION_PATTERNS } from '@/lib/constants'
import MascotLoader from './MascotLoader'
import VerdictCard  from './VerdictCard'
import Citation     from './Citation'
import TraceStrip   from './TraceStrip'

type Phase = 'idle' | 'running' | 'done' | 'error'

const ArrowR = () => (
  <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10m0 0L8 3m5 5L8 13"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ShieldX = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 1.5l5.5 1.8v4.2c0 3.4-2.3 6-5.5 7-3.2-1-5.5-3.6-5.5-7V3.3L8 1.5z"
      stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M5.8 7l4.4 0M6.5 5.5l3 3M6.5 8.5l3-3"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

export default function CheckView() {
  const [text,        setText]        = useState('')
  const [phase,       setPhase]       = useState<Phase>('idle')
  const [stepIdx,     setStepIdx]     = useState(0)
  const [completedMs, setCompletedMs] = useState<number[]>([])
  const [result,      setResult]      = useState<CheckResponse | null>(null)
  const [errorMsg,    setErrorMsg]    = useState('')
  const [expandedId,  setExpandedId]  = useState<number | null>(null)
  const [flashId,     setFlashId]     = useState<number | null>(null)
  const [activeSample,setActiveSample]= useState<string | null>(null)
  const [isInjection, setIsInjection] = useState(false)
  const [showTrace,   setShowTrace]   = useState(false)

  const timersRef  = useRef<ReturnType<typeof setTimeout>[]>([])
  const citeRefs   = useRef<Map<number, HTMLDivElement>>(new Map())

  const inResults = phase !== 'idle'
  const charCount = text.length
  const overLimit = charCount > 500
  const tooShort  = text.trim().length < 5

  function resetTimers() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  function startSimulation() {
    let acc = 0
    PIPELINE_STEPS.forEach((s, i) => {
      const ms = Math.round(s.ms * (0.85 + Math.random() * 0.3))
      acc += ms
      timersRef.current.push(
        setTimeout(() => {
          setStepIdx(i + 1)
          setCompletedMs((prev) => [...prev, ms])
        }, acc)
      )
    })
  }

  async function run() {
    if (!text.trim() || text.trim().length < 5 || phase === 'running') return
    resetTimers()
    setPhase('running')
    setStepIdx(0)
    setCompletedMs([])
    setResult(null)
    setErrorMsg('')
    setExpandedId(null)
    startSimulation()

    try {
      const r = await checkClaim(text)
      setResult(r)
      // Wait for at least the simulation to visually finish before showing results
      timersRef.current.push(
        setTimeout(() => {
          setPhase('done')
          setExpandedId(0)
        }, 200)
      )
    } catch (err) {
      resetTimers()
      setPhase('error')
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  function newClaim() {
    resetTimers()
    setPhase('idle')
    setStepIdx(0)
    setCompletedMs([])
    setResult(null)
    setText('')
    setActiveSample(null)
    setIsInjection(false)
    setExpandedId(null)
  }

  function pickSample(id: string, raw: string) {
    setActiveSample(id)
    setIsInjection(false)
    setText(raw)
  }

  function pickInjection() {
    const next = !isInjection
    setIsInjection(next)
    if (next) {
      setActiveSample(null)
      setText(INJECTION_CLAIM)
    }
  }

  const setCiteRef = useCallback((idx: number) => (el: HTMLDivElement | null) => {
    if (el) citeRefs.current.set(idx, el)
    else    citeRefs.current.delete(idx)
  }, [])

  function jumpToRef(idx: number) {
    setExpandedId(idx)
    setFlashId(idx)
    const el = citeRefs.current.get(idx)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
    setTimeout(() => setFlashId(null), 1500)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run()
  }

  return (
    <div className="page" data-mode={inResults ? 'results' : 'idle'}>

      {/* Hero */}
      <section className="hero collapse hide-on-results">
        <span className="hero-eyebrow"><i />Bengaluru civic verification</span>
        <h1>Forwarded a claim?<br />Get the <span>truth</span> in seconds.</h1>
        <p>
          Paste any WhatsApp forward, headline, or rumour about Bengaluru.
          We check it against verified official and news sources, and show you
          exactly where the answer comes from.
        </p>
      </section>

      {/* Input card */}
      <div className="input-card collapse hide-on-results">
        <textarea
          className="input-area"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Paste a forwarded WhatsApp message, headline, or claim about Bengaluru…"
          spellCheck={false}
        />
        <div className="input-foot">
          <span className="input-meta">
            <b className={overLimit ? 'input-warn' : ''}>{charCount}</b> / 500
            {overLimit && <span className="input-warn">· will truncate</span>}
          </span>
          <button
            className="input-cta"
            disabled={!text.trim() || tooShort || phase === 'running'}
            onClick={run}
          >
            {phase === 'running' ? 'Checking…' : 'Check this claim'}
            <ArrowR />
          </button>
        </div>
      </div>

      {/* Sample chips */}
      <div className="samples collapse hide-on-results">
        <span className="samples-l">Try:</span>
        {SAMPLE_CLAIMS.map((c) => (
          <button
            key={c.id}
            className="chip"
            data-v={c.verdict}
            data-on={!isInjection && activeSample === c.id ? '1' : '0'}
            onClick={() => pickSample(c.id, c.raw)}
          >
            <i />{c.label}
          </button>
        ))}
        <button
          className="chip chip-inj"
          data-on={isInjection ? '1' : '0'}
          onClick={pickInjection}
        >
          ⚠ Injection demo
        </button>
      </div>

      {/* Trace toggle (small link, visible after results) */}
      {phase === 'done' && (
        <div style={{ textAlign: 'right', marginTop: 4 }}>
          <button
            style={{
              appearance: 'none', border: 0, background: 'transparent',
              fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)',
              cursor: 'pointer', letterSpacing: '.04em',
            }}
            onClick={() => setShowTrace((v) => !v)}
          >
            {showTrace ? 'hide trace' : 'show trace'}
          </button>
        </div>
      )}

      {/* Recap bar */}
      {inResults && (
        <div className="recap" key={text}>
          <span className="recap-claim" title={text}>{text}</span>
          <button className="recap-btn" onClick={newClaim} aria-label="Check a new claim">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M3 4h7a3 3 0 0 1 3 3v5M3 4l3-3M3 4l3 3"
                stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            New claim
          </button>
        </div>
      )}

      {/* Results area */}
      {inResults && (
        <div className="results" key={`results-${phase}`}>

          {phase === 'running' && (
            <MascotLoader
              stepIdx={stepIdx}
              completedMs={completedMs}
              isInjection={isInjection}
            />
          )}

          {phase === 'error' && (
            <div className="error-card">
              <h3>Pipeline error</h3>
              <p>{errorMsg || 'Could not reach the backend. Is it running on port 8000?'}</p>
            </div>
          )}

          {phase === 'done' && result && (
            <>
              <VerdictCard
                verdict={result.verdict}
                confidence={result.confidence}
                summary={result.summary}
              />

              {isInjection && (
                <div className="inj">
                  <h4><ShieldX />Injection patterns blocked at the sanitiser</h4>
                  <p>
                    Three layers held: input was sanitised, wrapped as opaque DATA, and the
                    system prompt was bookended. The verdict reflects the actual claim.
                  </p>
                  <ul>
                    {INJECTION_PATTERNS.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              )}

              <div className="src-h">
                <h3>Sources</h3>
                <span className="src-meta">
                  {result.citations.length} source{result.citations.length !== 1 ? 's' : ''} checked
                </span>
              </div>

              {result.citations.length === 0 && (
                <div style={{
                  padding: '20px 22px', background: 'var(--bg-2)',
                  borderRadius: 'var(--r-md)', border: '1px solid var(--rule)',
                  fontSize: 14, color: 'var(--ink-2)',
                }}>
                  No sources found in the index. The claim may be too recent or outside our coverage.
                </div>
              )}

              {result.citations.map((c, i) => (
                <Citation
                  key={i}
                  citation={c}
                  index={i}
                  expanded={expandedId === i}
                  flash={flashId === i}
                  onToggle={() => setExpandedId(expandedId === i ? null : i)}
                  refCallback={setCiteRef(i)}
                />
              ))}

              {showTrace && <TraceStrip completedMs={completedMs} />}

              {result.query && (
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10.5,
                  color: 'var(--ink-3)', textAlign: 'center',
                  letterSpacing: '.04em', paddingTop: 8,
                }}>
                  search query: &ldquo;{result.query}&rdquo;
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
