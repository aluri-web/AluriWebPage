import { NextRequest, NextResponse } from 'next/server'
import http from 'node:http'
import https from 'node:https'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { apiLimiter, getClientIp } from '@/lib/rate-limit'
import { auditLogApi } from '@/lib/audit-log'

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://127.0.0.1:3001'

// ── Input validation ──
const evaluateSchema = z.object({
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
    // Flash card fields
    property_type: z.string().max(50).optional(),
    city: z.string().max(100).optional(),
    payment_mode: z.enum(['solo_intereses', 'capital_intereses']).optional(),
    rate_type: z.enum(['anticipado', 'vencido']).optional(),
    net_rate_monthly: z.number().min(0).max(10).optional(),
    property_address: z.string().max(300).optional(),
    // Admin-declared values for contrast
    declared_income_cop: z.number().positive().optional(),
    declared_appraisal_cop: z.number().positive().optional(),
    persona_type: z.enum(['persona_natural', 'persona_juridica']).optional(),
  }),
  documents: z.record(
    z.string().max(50),
    z.string().url().max(2000)
  ).refine(obj => Object.keys(obj).length <= 10, {
    message: 'Máximo 10 documentos',
  }),
  photo_urls: z.array(z.string().url().max(2000)).max(20).optional(),
  admin_notes: z.string().max(2000).optional(),
})

/** POST to orchestrator using node:http with a 10-minute timeout */
function postToOrchestrator(
  url: string,
  body: object
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const payload = JSON.stringify(body)

    const transport = parsed.protocol === 'https:' ? https : http
    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
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
            reject(new Error('Invalid response from orchestrator'))
          }
        })
      }
    )

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Orchestrator request timed out'))
    })

    req.write(payload)
    req.end()
  })
}

export async function POST(request: NextRequest) {
  // ── Rate limiting ──
  const ip = getClientIp(request)
  const rateCheck = await apiLimiter.check(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intente más tarde.' },
      { status: 429, headers: apiLimiter.headers(rateCheck) }
    )
  }

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

  // ── Validate input ──
  let body: z.infer<typeof evaluateSchema>
  try {
    const raw = await request.json()
    body = evaluateSchema.parse(raw)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', fields: err.issues.map(e => e.path.join('.')) },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  // ── Forward to orchestrator ──
  try {
    const { status, data } = await postToOrchestrator(
      `${ORCHESTRATOR_URL}/api/evaluate-by-urls`,
      body
    )

    // Audit log the evaluation
    auditLogApi(supabase, {
      action: 'admin.action',
      resource_type: 'solicitud',
      resource_id: body.operation.operation_id,
      user_id: user.id,
      ip_address: ip,
      details: {
        type: 'ai_evaluation',
        verdict: data.verdict,
        risk_level: data.riskLevel,
      },
    })

    return NextResponse.json(data, { status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[orchestrator-proxy] ERROR:', msg)
    // Don't expose internal error details to the client
    return NextResponse.json({ error: 'Error al comunicarse con el servicio de evaluación' }, { status: 502 })
  }
}
