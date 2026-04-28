import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://127.0.0.1:3001'

/**
 * POST /api/orchestrator/cancel-stuck
 *
 * Body: { evaluationId: string, min_age_minutes?: number, reason?: string }
 *
 * Marca como "failed" una evaluación que se quedó en "processing" por más de
 * `min_age_minutes` (default 5). Útil cuando el background job del orquestador
 * murió silenciosamente. Solo admins.
 */
export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json()
    const evaluationId = body.evaluationId
    if (!evaluationId) {
      return NextResponse.json({ error: 'evaluationId is required' }, { status: 400 })
    }
    const res = await fetch(`${ORCHESTRATOR_URL}/api/evaluations/${evaluationId}/cancel-stuck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        min_age_minutes: body.min_age_minutes,
        reason: body.reason,
      }),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[orchestrator-cancel-stuck] ERROR:', msg)
    return NextResponse.json({ error: 'Error al cancelar evaluación' }, { status: 502 })
  }
}
