import type { CheckResponse, IndexStats } from '@/types'

export async function checkClaim(claim: string): Promise<CheckResponse> {
  const res = await fetch('/api/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string | Array<{ msg: string }> }
    let msg = `HTTP ${res.status}`
    if (typeof err.detail === 'string') msg = err.detail
    else if (Array.isArray(err.detail) && err.detail.length > 0) msg = err.detail[0].msg
    throw new Error(msg)
  }
  return res.json() as Promise<CheckResponse>
}

export async function fetchStats(): Promise<IndexStats> {
  const res = await fetch('/api/stats', { next: { revalidate: 30 } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<IndexStats>
}

export function isOfficialSource(source: string): boolean {
  const lower = source.toLowerCase()
  return ['bmrcl', 'bbmp', 'bwssb', 'pib', 'karnataka.gov', 'karnataka gov'].some((k) =>
    lower.includes(k)
  )
}

export function indexedAgo(indexedAt: string): string {
  if (!indexedAt) return ''
  const ms = Date.now() - new Date(indexedAt).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60)  return `${mins} m`
  const hrs  = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs} h`
  return `${Math.floor(hrs / 24)} d`
}

export function isStale(indexedAt: string): boolean {
  if (!indexedAt) return false
  return Date.now() - new Date(indexedAt).getTime() > 4 * 3600 * 1000
}
