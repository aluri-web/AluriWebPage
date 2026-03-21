import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://127.0.0.1:3001'

export async function GET(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
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

  // Get evaluationId from query params
  const evaluationId = request.nextUrl.searchParams.get('id')
  if (!evaluationId) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
  }

  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/evaluations/${evaluationId}`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[orchestrator-status] ERROR:', msg)
    return NextResponse.json({ error: 'Error al consultar estado' }, { status: 502 })
  }
}
