'use server'

import { createClient } from '../../../../utils/supabase/server'

export interface SolicitudSummary {
  id: string
  direccion_inmueble: string
  ciudad: string
  monto_requerido: number
  valor_inmueble: number
  plazo_meses: number | null
  uso_dinero: string | null
  created_at: string
  documentos: { tipo: string; url: string }[]
  fotos: { tipo: string; url: string }[]
  solicitante: {
    full_name: string | null
    email: string | null
  } | null
}

export async function getSolicitudesForAgents(): Promise<{
  data: SolicitudSummary[]
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('solicitudes_credito')
    .select(`
      id,
      direccion_inmueble,
      ciudad,
      monto_requerido,
      valor_inmueble,
      plazo_meses,
      uso_dinero,
      documentos,
      fotos,
      created_at,
      solicitante:profiles!solicitante_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching solicitudes for agents:', error.message)
    return { data: [], error: error.message }
  }

  const rows: SolicitudSummary[] = (data || []).map(row => ({
    ...row,
    documentos: (row.documentos || []) as { tipo: string; url: string }[],
    fotos: (row.fotos || []) as { tipo: string; url: string }[],
    solicitante: row.solicitante as unknown as SolicitudSummary['solicitante'],
  }))

  return { data: rows, error: null }
}

// ── Evaluaciones IA persistence ─────────────────────────

export interface EvaluacionIA {
  id: string
  solicitud_id: string | null
  admin_id: string
  applicant: { name: string; cedula: string }
  operation: Record<string, unknown>
  documents: Record<string, string>
  verdict: string | null
  risk_level: string | null
  risk_score: number | null
  sections: Record<string, string> | null
  pdf_url: string | null
  evaluation_id: string | null
  interest_rate: number | null
  processing_ms: number | null
  photo_urls?: string[] | null
  created_at: string
}

export interface SaveEvaluationInput {
  solicitud_id?: string | null
  applicant: { name: string; cedula: string }
  operation: Record<string, unknown>
  documents: Record<string, string>
  verdict?: string | null
  risk_level?: string | null
  risk_score?: number | null
  sections?: Record<string, string> | null
  pdf_url?: string | null
  evaluation_id?: string | null
  interest_rate?: number | null
  processing_ms?: number | null
  photo_urls?: string[] | null
}

export async function saveEvaluation(input: SaveEvaluationInput): Promise<{
  data: { id: string } | null
  error: string | null
}> {
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { data: null, error: 'No autorizado' }

  const { data, error } = await supabase
    .from('evaluaciones_ia')
    .insert({
      solicitud_id: input.solicitud_id || null,
      admin_id: user.id,
      applicant: input.applicant,
      operation: input.operation,
      documents: input.documents,
      verdict: input.verdict || null,
      risk_level: input.risk_level || null,
      risk_score: input.risk_score != null ? Math.round(input.risk_score) : null,
      sections: input.sections || null,
      pdf_url: input.pdf_url || null,
      evaluation_id: input.evaluation_id || null,
      interest_rate: input.interest_rate ?? null,
      processing_ms: input.processing_ms ?? null,
      ...(input.photo_urls ? { photo_urls: input.photo_urls } : {}),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error saving evaluation:', error.message)
    return { data: null, error: 'Error al guardar evaluación' }
  }

  return { data: { id: data.id }, error: null }
}

export async function getEvaluations(solicitudId?: string): Promise<{
  data: EvaluacionIA[]
  error: string | null
}> {
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { data: [], error: 'No autorizado' }

  let query = supabase
    .from('evaluaciones_ia')
    .select('*')
    .not('verdict', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (solicitudId) {
    query = query.eq('solicitud_id', solicitudId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching evaluations:', error.message)
    return { data: [], error: 'Error al obtener evaluaciones' }
  }

  return { data: (data || []) as EvaluacionIA[], error: null }
}
