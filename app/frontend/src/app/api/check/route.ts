import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown
    const upstream = await fetch(`${BACKEND}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })
    const data = await upstream.json() as unknown
    return NextResponse.json(data, { status: upstream.status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upstream error'
    return NextResponse.json({ detail: msg }, { status: 502 })
  }
}
