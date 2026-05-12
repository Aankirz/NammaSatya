import { NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const upstream = await fetch(`${BACKEND}/index/stats`, {
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 30 },
    })
    const data = await upstream.json() as unknown
    return NextResponse.json(data, { status: upstream.status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upstream error'
    return NextResponse.json({ detail: msg }, { status: 502 })
  }
}
