'use server'

import { createClient } from '../../../../utils/supabase/server'

export interface SolicitudSummary {
  id: string
  direccion_inmueble: string
  ciudad: string
  monto_requerido: number
  valor_inmueble: number
  plazo_meses: number | null
  created_at: string
  documentos: { tipo: string; url: string }[]
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
      documentos,
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
    solicitante: row.solicitante as unknown as SolicitudSummary['solicitante'],
  }))

  return { data: rows, error: null }
}
