import { NextRequest, NextResponse } from 'next/server'
import http from 'node:http'
import { createClient } from '@/utils/supabase/server'

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://127.0.0.1:3001'

/** POST to orchestrator using node:http with a 10-minute timeout */
function postToOrchestrator(
  url: string,
  body: object
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const payload = JSON.stringify(body)

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 600_000, // 10 minutes
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => (raw += chunk))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode ?? 500, data: JSON.parse(raw) })
          } catch {
            reject(new Error(`Invalid JSON from orchestrator: ${raw.slice(0, 200)}`))
          }
        })
      }
    )

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Orchestrator request timed out (10 min)'))
    })

    req.write(payload)
    req.end()
  })
}

export async function POST(request: NextRequest) {
  // ── Auth check (admin only) ──
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // ── Forward to orchestrator ──
  const body = await request.json()

  try {
    const { status, data } = await postToOrchestrator(
      `${ORCHESTRATOR_URL}/api/evaluate-by-urls`,
      body
    )

    return NextResponse.json(data, { status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[orchestrator-proxy]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
