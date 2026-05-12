'use client'

import { useEffect, useState } from 'react'
import PieChart  from './PieChart'
import TimeSeries from './TimeSeries'
import type { DashMockData, Verdict } from '@/types'

const VERDICT_FILL: Record<Verdict, string> = {
  SUPPORTED:  'var(--v-sup)',
  REFUTED:    'var(--v-ref)',
  UNVERIFIED: 'var(--v-unv)',
  MANGLED:    'var(--v-man)',
}

function fmt(iso: string) {
  try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) }
  catch { return iso }
}

const Shim = ({ w, h, style }: { w?: number | string; h: number; style?: React.CSSProperties }) => (
  <div className="shim" style={{ width: w ?? '100%', height: h, ...style }} />
)

const EMPTY_FRESHNESS = { lastCrawl: '', lastRss: '', nextCrawl: '' }

export default function Dashboard() {
  const [D, setD]           = useState<DashMockData | null>(null)
  const [liveTotal, setLiveTotal] = useState<number | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.ok ? r.json() : null)
      .then((stats: {
        total_documents?: number
        by_source?: Record<string, number>
        by_type?: Record<string, number>
        timeline?: { label: string; total: number; news: number; official: number }[]
        as_of?: string
        claims_today?: number
        claims_trend?: number[]
        verdict_dist?: { v: string; n: number; pct: number }[]
        injection?: {
          blocked24h: number
          examples: { snippet: string; source: string }[]
        }
      } | null) => {
        if (!stats) { setLoading(false); return }

        setD({
          claimsToday:  stats.claims_today ?? 0,
          claimsTrend:  stats.claims_trend ?? [0],
          verdictDist:  (stats.verdict_dist ?? []) as DashMockData['verdictDist'],
          injection:    stats.injection ?? { blocked24h: 0, examples: [] },
          topSources:   Object.entries(stats.by_source ?? {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([name, n]) => ({ name, n })),
          indexedSeries: stats.timeline && stats.timeline.length > 0
            ? {
                labels:   stats.timeline.map((d) => d.label),
                news:     stats.timeline.map((d) => d.news),
                official: stats.timeline.map((d) => d.official),
              }
            : { labels: [], news: [], official: [] },
          freshness: {
            ...EMPTY_FRESHNESS,
            lastRss: stats.as_of ?? '',
          },
        })

        if (stats.total_documents) setLiveTotal(stats.total_documents)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const totalDocs = D
    ? D.indexedSeries.official.reduce((a, b) => a + b, 0) +
      D.indexedSeries.news.reduce((a, b) => a + b, 0)
    : 0

  const freshness = D?.freshness ?? EMPTY_FRESHNESS

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="dash-sub">NammaSatya · Operations</div>
          <h2>Dashboard</h2>
        </div>
        <div className="dash-meta">
          <span className="live"><i />Live</span>
          <span>last crawl <b>{fmt(freshness.lastCrawl)}</b></span>
          <span>·</span>
          <span>last RSS <b>{fmt(freshness.lastRss)}</b></span>
          <span>·</span>
          <span>next crawl <b>{fmt(freshness.nextCrawl)}</b></span>
        </div>
      </div>

      {/* Claims today */}
      <section className="panel col-4">
        <div className="panel-hd">
          <h3>Claims checked today</h3>
          <span className="panel-meta">live · this session</span>
        </div>
        {loading ? (
          <>
            <Shim w={100} h={72} style={{ marginTop: 10 }} />
            <Shim w={180} h={13} style={{ marginTop: 10 }} />
            <Shim h={44} style={{ marginTop: 14 }} />
          </>
        ) : (
          <>
            <div className="ct-num">{(D?.claimsToday ?? 0).toLocaleString()}</div>
            <div className="ct-delta">since last server restart</div>
            <div className="ct-spark">
              {(D?.claimsTrend ?? [0]).map((v, i, arr) => {
                const max = Math.max(...arr) || 1
                return <i key={i} style={{ height: `${(v / max) * 100}%` }} />
              })}
            </div>
          </>
        )}
      </section>

      {/* Verdict distribution */}
      <section className="panel col-4">
        <div className="panel-hd">
          <h3>Verdict distribution</h3>
          <span className="panel-meta">live · this session</span>
        </div>
        {loading ? (
          <div className="pie-wrap" style={{ marginTop: 12 }}>
            <Shim w={148} h={148} style={{ borderRadius: '50%', flexShrink: 0 }} />
            <div className="pie-legend">
              {[90, 70, 80, 60].map((w, i) => <Shim key={i} w={w} h={13} style={{ marginBottom: 4 }} />)}
            </div>
          </div>
        ) : (
          <div className="pie-wrap">
            <PieChart data={(D?.verdictDist ?? []) as DashMockData['verdictDist']} />
            <div className="pie-legend">
              {(D?.verdictDist ?? []).map((d) => (
                <div key={d.v} className="pie-leg">
                  <i style={{ background: VERDICT_FILL[d.v] }} />
                  <span>{d.v}</span>
                  <b>{d.n}</b>
                  <span className="pie-leg-pct">{Math.round(d.pct * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Injection blocked */}
      <section className="panel col-4">
        <div className="panel-hd">
          <h3>Injection attempts blocked</h3>
          <span className="panel-meta">live · 24 h</span>
        </div>
        {loading ? (
          <>
            <Shim w={80} h={56} style={{ marginTop: 10 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <Shim h={46} />
              <Shim h={46} />
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div className="inj-num">{D?.injection.blocked24h ?? 0}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600 }}>
                stripped at sanitiser
              </div>
            </div>
            <div className="inj-list">
              {(D?.injection.examples ?? []).map((e, i) => (
                <div key={i} className="inj-row">
                  <div className="inj-snip">{e.snippet}</div>
                  <div className="inj-meta">{e.source}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Top sources */}
      <section className="panel col-5">
        <div className="panel-hd">
          <h3>Top indexed sources</h3>
          <span className="panel-meta">live · {liveTotal ?? '—'} docs</span>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {[1, 0.75, 0.55, 0.4, 0.3].map((_, i) => <Shim key={i} h={18} />)}
          </div>
        ) : (
          <div className="src-list">
            {(D?.topSources ?? []).map((s) => {
              const max = Math.max(...(D?.topSources ?? []).map((x) => x.n))
              return (
                <div key={s.name} className="src-row">
                  <span>{s.name}</span>
                  <div className="src-bar"><i style={{ width: `${(s.n / max) * 100}%` }} /></div>
                  <span className="src-n">{s.n}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Time series */}
      <section className="panel col-7">
        <div className="panel-hd">
          <h3>Indexed documents by source over time</h3>
          <span className="panel-meta">{(liveTotal ?? totalDocs).toLocaleString()} docs indexed</span>
        </div>
        {loading ? (
          <Shim h={200} style={{ marginTop: 10 }} />
        ) : (
          <>
            <TimeSeries
              labels={(D?.indexedSeries.labels ?? [])}
              official={(D?.indexedSeries.official ?? [])}
              news={(D?.indexedSeries.news ?? [])}
            />
            <div className="ts-leg">
              <span><i />Official (BMRCL · BBMP · BWSSB · PIB · karnataka.gov)</span>
              <span className="ts-news"><i />News (RSS)</span>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
