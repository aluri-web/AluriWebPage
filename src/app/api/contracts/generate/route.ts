import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const CONTRACT_AGENT_URL = process.env.CONTRACT_AGENT_URL || 'http://127.0.0.1:8003'

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()

    const res = await fetch(`${CONTRACT_AGENT_URL}/api/contracts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[contract-proxy] ERROR:', msg)
    return NextResponse.json(
      { error: `Error al generar contrato: ${msg}` },
      { status: 502 }
    )
  }
}
