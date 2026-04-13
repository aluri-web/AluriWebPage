import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const CONTRACT_AGENT_URL = process.env.CONTRACT_AGENT_URL || 'http://127.0.0.1:8003'

export async function GET(request: NextRequest) {
  // ── Auth check (admin only) ──
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const contractId = request.nextUrl.searchParams.get('id')
  if (!contractId) {
    return NextResponse.json({ error: 'Falta id del contrato' }, { status: 400 })
  }

  try {
    const res = await fetch(`${CONTRACT_AGENT_URL}/api/contracts/${contractId}/download`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[contract-download] ERROR:', msg)
    return NextResponse.json({ error: 'Error al obtener URL de descarga' }, { status: 502 })
  }
}
