'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface DocumentItem {
  tipo: string
  url: string
}

interface FotoItem {
  tipo: string
  url: string
}

interface SolicitudData {
  direccion_inmueble: string
  ciudad: string
  tiene_hipoteca: boolean
  a_nombre_solicitante: boolean
  monto_requerido: number
  valor_inmueble: number
  uso_dinero: string
  documentos: DocumentItem[]
  fotos: FotoItem[]
}

export async function submitCreditRequest(
  data: SolicitudData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'No autenticado.' }
    }

    if (!data.direccion_inmueble || !data.ciudad) {
      return { success: false, error: 'Direccion y ciudad son requeridos.' }
    }

    if (!data.monto_requerido || data.monto_requerido <= 0) {
      return { success: false, error: 'El monto requerido debe ser mayor a cero.' }
    }

    if (!data.valor_inmueble || data.valor_inmueble <= 0) {
      return { success: false, error: 'El valor del inmueble debe ser mayor a cero.' }
    }

    const ltv = (data.monto_requerido / data.valor_inmueble) * 100
    if (ltv > 60) {
      return { success: false, error: 'El monto requerido no puede superar el 60% del valor del inmueble.' }
    }

    const { error: insertError } = await supabase
      .from('solicitudes_credito')
      .insert({
        solicitante_id: user.id,
        direccion_inmueble: data.direccion_inmueble,
        ciudad: data.ciudad,
        tiene_hipoteca: data.tiene_hipoteca,
        a_nombre_solicitante: data.a_nombre_solicitante,
        monto_requerido: data.monto_requerido,
        valor_inmueble: data.valor_inmueble,
        uso_dinero: data.uso_dinero,
        documentos: data.documentos,
        fotos: data.fotos,
      })

    if (insertError) {
      console.error('Error inserting solicitud:', insertError)
      return { success: false, error: 'Error al enviar la solicitud.' }
    }

    revalidatePath('/dashboard/propietario/solicitar-credito')
    return { success: true }
  } catch (error) {
    console.error('Error in submitCreditRequest:', error)
    return { success: false, error: 'Error inesperado.' }
  }
}
