import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { apiLimiter, getClientIp } from '@/lib/rate-limit'
import { auditLogApi } from '@/lib/audit-log'

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://127.0.0.1:3001'

const updateSchema = z.object({
  evaluationId: z.string().uuid(),
  applicant: z.object({
    name: z.string().min(1).max(200),
    cedula: z.string().min(1).max(20),
  }),
  operation: z.object({
    operation_id: z.string().max(100),
    loan_amount: z.number().positive(),
    loan_term_months: z.number().int().positive().max(360),
    interest_rate_monthly: z.number().min(0).max(10),
    monthly_payment: z.number().positive(),
    guarantee_type: z.string().max(50),
    property_appraisal_value: z.number().positive(),
    ltv_percent: z.number().min(0).max(200),
    loan_purpose: z.string().max(200),
    property_type: z.string().max(50).optional(),
    city: z.string().max(100).optional(),
    payment_mode: z.enum(['solo_intereses', 'capital_intereses']).optional(),
    rate_type: z.enum(['anticipado', 'vencido']).optional(),
    net_rate_monthly: z.number().min(0).max(10).optional(),
    property_address: z.string().max(300).optional(),
    declared_income_cop: z.number().positive().optional(),
    persona_type: z.enum(['persona_natural', 'persona_juridica']).optional(),
  }).passthrough(),
  documents: z.record(
    z.string().max(50),
    z.string().url().max(2000)
  ).refine(obj => Object.keys(obj).length <= 30, {
    message: 'Máximo 30 documentos',
  }),
  photo_urls: z.array(z.string().url().max(2000)).max(20).optional(),
  admin_notes: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateCheck = await apiLimiter.check(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intente más tarde.' },
      { status: 429, headers: apiLimiter.headers(rateCheck) }
    )
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: z.infer<typeof updateSchema>
  try {
    body = updateSchema.parse(await request.json())
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', fields: err.issues.map(e => e.path.join('.')) },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { evaluationId, ...payload } = body

  try {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/evaluations/${evaluationId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    auditLogApi(supabase, {
      action: 'admin.action',
      resource_type: 'solicitud',
      resource_id: body.operation.operation_id,
      user_id: user.id,
      ip_address: ip,
      details: { type: 'ai_evaluation_update_started', evaluationId },
    })

    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[orchestrator-update-proxy] ERROR:', msg)
    return NextResponse.json({ error: 'Error al comunicarse con el servicio de evaluación' }, { status: 502 })
  }
}
