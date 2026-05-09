export type Verdict = 'SUPPORTED' | 'REFUTED' | 'UNVERIFIED' | 'MANGLED'
export type VerdictTreatment = 'confident' | 'loud' | 'restrained'
export type AppView = 'check' | 'dashboard'

export interface Citation {
  source: string
  url: string
  excerpt: string
  date: string
  indexed_at: string
}

export interface CheckResponse {
  verdict: Verdict
  confidence: number
  summary: string
  citations: Citation[]
  query: string
  checked_at: string
}

export interface PipelineStep {
  id: string
  label: string
  ms: number
}

export interface SampleClaim {
  id: string
  label: string
  verdict: Verdict
  raw: string
}

// Dashboard stats from the backend /index/stats endpoint
export interface IndexStats {
  total_documents: number
  by_source: Record<string, number>
  by_type: Record<string, number>
  index: string
  as_of: string
}

export interface DashMockData {
  claimsToday: number
  claimsTrend: number[]
  verdictDist: { v: Verdict; n: number; pct: number }[]
  topSources: { name: string; n: number }[]
  indexedSeries: {
    labels: string[]
    official: number[]
    news: number[]
  }
  injection: {
    blocked24h: number
    examples: { snippet: string; source: string }[]
  }
  freshness: {
    lastCrawl: string
    lastRss: string
    nextCrawl: string
  }
}
