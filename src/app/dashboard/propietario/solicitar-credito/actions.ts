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

interface SolicitanteNatural {
  rol: 'deudor' | 'codeudor'
  tipo_persona: 'natural'
  nombre: string
  tipo_ingreso: string
}

interface SolicitanteJuridica {
  rol: 'deudor' | 'codeudor'
  tipo_persona: 'juridica'
  nombre_empresa: string
  tipo_sociedad: string
  fecha_constitucion: string
  tamano_empresa: string
  resultado_operativo: string
  endeudamiento_total: string
  cobertura_dscr: string
}

type SolicitanteData = SolicitanteNatural | SolicitanteJuridica

interface SolicitudData {
  direccion_inmueble: string
  ciudad: string
  tiene_hipoteca: boolean
  a_nombre_solicitante: boolean
  monto_requerido: number
  valor_inmueble: number
  plazo_meses: number
  uso_dinero: string
  solicitante: SolicitanteData
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
        plazo_meses: data.plazo_meses,
        uso_dinero: data.uso_dinero,
        solicitante: data.solicitante,
        documentos: data.documentos,
        fotos: data.fotos,
      })

    if (insertError) {
      console.error('Error inserting solicitud:', insertError)
      return { success: false, error: 'Error al enviar la solicitud.' }
    }

    // Notify all admins about the new solicitud
    const formatCOP = (v: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const nombre = profile?.full_name || 'Propietario'

    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        tipo: 'nueva_solicitud_credito',
        titulo: 'Nueva solicitud de credito',
        mensaje: `${nombre} ha solicitado un credito por ${formatCOP(data.monto_requerido)} en ${data.ciudad}`,
        metadata: {},
      }))

      await supabase.from('notificaciones').insert(notifications)
    }

    revalidatePath('/dashboard/propietario/solicitar-credito')
    revalidatePath('/dashboard/propietario/mis-solicitudes')
    return { success: true }
  } catch (error) {
    console.error('Error in submitCreditRequest:', error)
    return { success: false, error: 'Error inesperado.' }
  }
}
