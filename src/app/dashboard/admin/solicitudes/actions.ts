'use server'

import { createClient } from '../../../../utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SolicitudRow {
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
  solicitante: {
    full_name: string | null
    email: string | null
    document_id: string | null
  } | null
}

export async function getSolicitudes(): Promise<{ data: SolicitudRow[]; error: string | null }> {
  const supabase = await createClient()

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
      updated_at,
      solicitante:profiles!solicitante_id (
        full_name,
        email,
        document_id
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching solicitudes:', error.message)
    return { data: [], error: error.message }
  }

  const rows: SolicitudRow[] = (data || []).map(row => ({
    ...row,
    documentos: (row.documentos || []) as { tipo: string; url: string }[],
    fotos: (row.fotos || []) as { tipo: string; url: string }[],
    solicitante: row.solicitante as unknown as SolicitudRow['solicitante'],
  }))

  return { data: rows, error: null }
}

export async function updateEstadoSolicitud(
  id: string,
  nuevoEstado: string,
  notasAdmin?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, error: 'No autorizado' }
  }

  // Validate estado transition
  const validEstados = ['pendiente', 'en_revision', 'aprobada', 'rechazada']
  if (!validEstados.includes(nuevoEstado)) {
    return { success: false, error: 'Estado invalido' }
  }

  // Get current solicitud for notification
  const { data: solicitud } = await supabase
    .from('solicitudes_credito')
    .select('solicitante_id, ciudad, monto_requerido, estado')
    .eq('id', id)
    .single()

  if (!solicitud) {
    return { success: false, error: 'Solicitud no encontrada' }
  }

  // Update estado
  const updateData: Record<string, unknown> = {
    estado: nuevoEstado,
    updated_at: new Date().toISOString(),
  }
  if (notasAdmin !== undefined) {
    updateData.notas_admin = notasAdmin
  }

  const { error: updateError } = await supabase
    .from('solicitudes_credito')
    .update(updateData)
    .eq('id', id)

  if (updateError) {
    console.error('Error updating solicitud:', updateError.message)
    return { success: false, error: updateError.message }
  }

  // Send notification to the propietario
  const estadoLabels: Record<string, string> = {
    en_revision: 'en revision',
    aprobada: 'aprobada',
    rechazada: 'rechazada',
  }

  const estadoLabel = estadoLabels[nuevoEstado]
  if (estadoLabel) {
    const formatCOP = (v: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

    await supabase.from('notificaciones').insert({
      user_id: solicitud.solicitante_id,
      tipo: `solicitud_${nuevoEstado}`,
      titulo: `Solicitud ${estadoLabel}`,
      mensaje: `Tu solicitud de credito por ${formatCOP(solicitud.monto_requerido)} en ${solicitud.ciudad} ha sido ${estadoLabel}.${notasAdmin ? `\nNotas: ${notasAdmin}` : ''}`,
      metadata: { solicitud_id: id, estado: nuevoEstado },
    })
  }

  revalidatePath('/dashboard/admin/solicitudes')
  return { success: true }
}
