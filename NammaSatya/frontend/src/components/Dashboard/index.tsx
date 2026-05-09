'use client'

import { useEffect, useState } from 'react'
import PieChart  from './PieChart'
import TimeSeries from './TimeSeries'
import { DASH_MOCK } from '@/lib/constants'
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

export default function Dashboard() {
  const [D, setD]           = useState<DashMockData>(DASH_MOCK)
  const [liveTotal, setLiveTotal] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.ok ? r.json() : null)
      .then((stats: {
        total_documents?: number
        by_source?: Record<string, number>
        by_type?: Record<string, number>
        as_of?: string
      } | null) => {
        if (!stats || !stats.total_documents) return

        setD((prev) => {
          const next = { ...prev }

          // Top sources bar chart
          if (stats.by_source && Object.keys(stats.by_source).length > 0) {
            next.topSources = Object.entries(stats.by_source)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([name, n]) => ({ name, n }))
          }

          // Indexed-docs time series: replace the last (today's) data point with real counts
          if (stats.total_documents) {
            const newsCount     = stats.by_type?.['news']     ?? 0
            const officialCount = stats.total_documents - newsCount
            const series = { ...prev.indexedSeries }
            series.news     = [...prev.indexedSeries.news.slice(0, -1),     newsCount]
            series.official = [...prev.indexedSeries.official.slice(0, -1), officialCount]
            next.indexedSeries = series
          }

          // Freshness — use as_of as the last-RSS timestamp
          if (stats.as_of) {
            next.freshness = { ...prev.freshness, lastRss: stats.as_of }
          }

          return next
        })

        if (stats.total_documents) setLiveTotal(stats.total_documents)
      })
      .catch(() => { /* keep mock data */ })
  }, [])

  const totalDocs =
    D.indexedSeries.official.reduce((a, b) => a + b, 0) +
    D.indexedSeries.news.reduce((a, b) => a + b, 0)

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="dash-sub">NammaSatya · Operations</div>
          <h2>Dashboard</h2>
        </div>
        <div className="dash-meta">
          <span className="live"><i />Live</span>
          <span>last crawl <b>{fmt(D.freshness.lastCrawl)}</b></span>
          <span>·</span>
          <span>last RSS <b>{fmt(D.freshness.lastRss)}</b></span>
          <span>·</span>
          <span>next crawl <b>{fmt(D.freshness.nextCrawl)}</b></span>
        </div>
      </div>

      {/* Claims today */}
      <section className="panel col-4">
        <div className="panel-hd">
          <h3>Claims checked today</h3>
          <span className="panel-meta" title="Claim tracking not yet persisted">sample data</span>
        </div>
        <div className="ct-num">{D.claimsToday.toLocaleString()}</div>
        <div className="ct-delta"><b>↑ 5.7%</b> vs same hour yesterday</div>
        <div className="ct-spark">
          {D.claimsTrend.map((v, i) => {
            const max = Math.max(...D.claimsTrend)
            return <i key={i} style={{ height: `${(v / max) * 100}%` }} />
          })}
        </div>
      </section>

      {/* Verdict distribution */}
      <section className="panel col-4">
        <div className="panel-hd">
          <h3>Verdict distribution</h3>
          <span className="panel-meta" title="Verdict tracking not yet persisted">sample data</span>
        </div>
        <div className="pie-wrap">
          <PieChart data={D.verdictDist} />
          <div className="pie-legend">
            {D.verdictDist.map((d) => (
              <div key={d.v} className="pie-leg">
                <i style={{ background: VERDICT_FILL[d.v] }} />
                <span>{d.v}</span>
                <b>{d.n}</b>
                <span className="pie-leg-pct">{Math.round(d.pct * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Injection blocked */}
      <section className="panel col-4">
        <div className="panel-hd">
          <h3>Injection attempts blocked</h3>
          <span className="panel-meta" title="Injection logging not yet persisted">sample data</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div className="inj-num">{D.injection.blocked24h}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600 }}>
            stripped at sanitiser
          </div>
        </div>
        <div className="inj-list">
          {D.injection.examples.map((e, i) => (
            <div key={i} className="inj-row">
              <div className="inj-snip">{e.snippet}</div>
              <div className="inj-meta">{e.source}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Top sources */}
      <section className="panel col-5">
        <div className="panel-hd">
          <h3>Top indexed sources</h3>
          <span className="panel-meta">live · {liveTotal ?? '—'} docs</span>
        </div>
        <div className="src-list">
          {D.topSources.map((s) => {
            const max = Math.max(...D.topSources.map((x) => x.n))
            return (
              <div key={s.name} className="src-row">
                <span>{s.name}</span>
                <div className="src-bar"><i style={{ width: `${(s.n / max) * 100}%` }} /></div>
                <span className="src-n">{s.n}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Time series */}
      <section className="panel col-7">
        <div className="panel-hd">
          <h3>Indexed documents by source over time</h3>
          <span className="panel-meta">{(liveTotal ?? totalDocs).toLocaleString()} docs indexed</span>
        </div>
        <TimeSeries
          labels={D.indexedSeries.labels}
          official={D.indexedSeries.official}
          news={D.indexedSeries.news}
        />
        <div className="ts-leg">
          <span><i />Official (BMRCL · BBMP · BWSSB · PIB · karnataka.gov)</span>
          <span className="ts-news"><i />News (RSS)</span>
        </div>
      </section>
    </div>
  )
}
