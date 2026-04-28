import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://127.0.0.1:3001'

/**
 * POST /api/orchestrator/recompute
 *
 * Body: { evaluationId: string, credito_overrides: { tax_return?: {...}, employment?: {...} } }
 *
 * Manual validation step — admin corrected the auto-extracted F210 (or other)
 * values and wants to recompute scoring + regenerate ficha + anexos.
 * Proxies to the orchestrator's /api/evaluations/:id/recompute-overrides.
 * Admin role required.
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

    const which = body.which === 'codeudor' ? 'codeudor' : 'solicitante'

    const res = await fetch(
      `${ORCHESTRATOR_URL}/api/evaluations/${evaluationId}/recompute-overrides`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credito_overrides: body.credito_overrides ?? {}, which }),
      },
    )
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[orchestrator-recompute] ERROR:', msg)
    return NextResponse.json({ error: 'Error al recalcular evaluación' }, { status: 502 })
  }
}
