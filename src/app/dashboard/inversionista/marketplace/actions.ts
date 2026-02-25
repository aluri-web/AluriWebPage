'use server'

import { createClient } from '../../../../utils/supabase/server'

export interface MarketplaceCredito {
  id: string
  codigo_credito: string
  monto_solicitado: number
  tasa_interes_ea: number | null
  plazo: number | null
  ciudad_inmueble: string | null
  direccion_inmueble: string | null
  tipo_inmueble: string | null
  valor_comercial: number | null
  ltv: number | null
  fecha_firma_programada: string | null
  fecha_desembolso: string | null
  fotos_inmueble: string[] | null
  created_at: string
  inversiones: { monto_invertido: number; estado: string }[]
}

export async function getActiveLoans(): Promise<{ data: MarketplaceCredito[]; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('creditos')
    .select(`
      id,
      codigo_credito,
      monto_solicitado,
      tasa_interes_ea,
      plazo,
      ciudad_inmueble,
      direccion_inmueble,
      tipo_inmueble,
      valor_comercial,
      ltv,
      fecha_firma_programada,
      fecha_desembolso,
      fotos_inmueble,
      created_at,
      inversiones (
        monto_invertido,
        estado
      )
    `)
    .eq('estado', 'publicado')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching active creditos:', error.message)
    return { data: [], error: error.message }
  }

  return { data: data as unknown as MarketplaceCredito[], error: null }
}
