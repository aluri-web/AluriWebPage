'use server'

import { createClient } from '../../../../utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface MiSolicitud {
  id: string
  direccion_inmueble: string
  ciudad: string
  tiene_hipoteca: boolean
  a_nombre_solicitante: boolean
  monto_requerido: number
  valor_inmueble: number
  uso_dinero: string | null
  documentos: { tipo: string; url: string }[]
  fotos: { tipo: string; url: string }[]
  estado: string
  notas_admin: string | null
  created_at: string
  updated_at: string
}

export async function getMisSolicitudes(): Promise<{ data: MiSolicitud[]; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'No autenticado' }

  const { data, error } = await supabase
    .from('solicitudes_credito')
    .select(`
      id,
      direccion_inmueble,
      ciudad,
      tiene_hipoteca,
      a_nombre_solicitante,
      monto_requerido,
      valor_inmueble,
      uso_dinero,
      documentos,
      fotos,
      estado,
      notas_admin,
      created_at,
      updated_at
    `)
    .eq('solicitante_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching solicitudes:', error.message)
    return { data: [], error: error.message }
  }

  const rows: MiSolicitud[] = (data || []).map(row => ({
    ...row,
    documentos: (row.documentos || []) as { tipo: string; url: string }[],
    fotos: (row.fotos || []) as { tipo: string; url: string }[],
  }))

  return { data: rows, error: null }
}

export async function updateSolicitudDocumentos(
  solicitudId: string,
  documentos: { tipo: string; url: string }[],
  fotos: { tipo: string; url: string }[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  // Verify ownership and valid estado
  const { data: solicitud } = await supabase
    .from('solicitudes_credito')
    .select('id, solicitante_id, estado, ciudad, monto_requerido')
    .eq('id', solicitudId)
    .eq('solicitante_id', user.id)
    .single()

  if (!solicitud) {
    return { success: false, error: 'Solicitud no encontrada' }
  }

  if (solicitud.estado !== 'pendiente' && solicitud.estado !== 'en_revision') {
    return { success: false, error: 'Esta solicitud ya no puede ser modificada' }
  }

  const { error: updateError } = await supabase
    .from('solicitudes_credito')
    .update({
      documentos,
      fotos,
      updated_at: new Date().toISOString(),
    })
    .eq('id', solicitudId)
    .eq('solicitante_id', user.id)

  if (updateError) {
    console.error('Error updating solicitud:', updateError.message)
    return { success: false, error: updateError.message }
  }

  // Get propietario name for notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const nombre = profile?.full_name || 'Propietario'
  const docCount = documentos.length
  const fotoCount = fotos.length

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

  // Notify all admins
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (admins && admins.length > 0) {
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      tipo: 'documentos_actualizados',
      titulo: 'Documentos actualizados',
      mensaje: `${nombre} ha actualizado los documentos de su solicitud por ${formatCOP(solicitud.monto_requerido)} en ${solicitud.ciudad} (${docCount}/5 docs, ${fotoCount}/5 fotos)`,
      metadata: { solicitud_id: solicitudId },
    }))

    await supabase.from('notificaciones').insert(notifications)
  }

  revalidatePath('/dashboard/propietario/mis-solicitudes')
  return { success: true }
}
