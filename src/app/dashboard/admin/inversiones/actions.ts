'use server'

import { createClient } from '../../../../utils/supabase/server'
import { createAdminClient } from '../../../../utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PendingInvestment {
  id: string
  monto_invertido: number
  created_at: string
  investor: {
    full_name: string | null
    email: string | null
    document_id: string | null
  } | null
  credito: {
    codigo_credito: string
    monto_solicitado: number | null
  } | null
}

export async function getPendingInvestments(): Promise<{ data: PendingInvestment[]; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inversiones')
    .select(`
      id,
      monto_invertido,
      created_at,
      investor:profiles!inversionista_id (
        full_name,
        email,
        document_id
      ),
      credito:creditos!credito_id (
        codigo_credito,
        monto_solicitado
      )
    `)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending investments:', error.message)
    return { data: [], error: error.message }
  }

  return { data: data as unknown as PendingInvestment[], error: null }
}

export async function approveInvestment(investmentId: string): Promise<{ success: boolean; error?: string }> {
  // Verify caller is admin
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await authSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, error: 'No autorizado' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuracion del servidor incompleta.' }
  }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  // Fetch investment details for notification
  const { data: investment } = await supabase
    .from('inversiones')
    .select(`
      inversionista_id,
      monto_invertido,
      credito:creditos!credito_id (
        codigo_credito
      )
    `)
    .eq('id', investmentId)
    .single()

  const { error } = await supabase
    .from('inversiones')
    .update({
      estado: 'activo',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', investmentId)

  if (error) {
    console.error('Error approving investment:', error.message)
    return { success: false, error: error.message }
  }

  // Create notification for investor
  if (investment) {
    const creditCode = (investment.credito as any)?.codigo_credito || ''
    const amount = investment.monto_invertido
    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)

    await supabase.from('notificaciones').insert({
      user_id: investment.inversionista_id,
      tipo: 'inversion_aprobada',
      titulo: 'Inversión Aprobada',
      mensaje: `Tu inversión de ${formattedAmount} en el crédito ${creditCode} ha sido aprobada. Los fondos están activos.`,
      metadata: {
        investment_id: investmentId,
        credit_code: creditCode,
        amount
      }
    })
  }

  revalidatePath('/dashboard/admin/inversiones')
  revalidatePath('/dashboard/admin/colocaciones')
  revalidatePath('/dashboard/inversionista/notificaciones')
  return { success: true }
}

export async function rejectInvestment(investmentId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  // Verify caller is admin
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await authSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, error: 'No autorizado' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuracion del servidor incompleta.' }
  }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  // Fetch investment details for notification
  const { data: investment } = await supabase
    .from('inversiones')
    .select(`
      inversionista_id,
      monto_invertido,
      credito:creditos!credito_id (
        codigo_credito
      )
    `)
    .eq('id', investmentId)
    .single()

  const { error } = await supabase
    .from('inversiones')
    .update({
      estado: 'rechazado',
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      motivo_rechazo: reason || null
    })
    .eq('id', investmentId)

  if (error) {
    console.error('Error rejecting investment:', error.message)
    return { success: false, error: error.message }
  }

  // Create notification for investor
  if (investment) {
    const creditCode = (investment.credito as any)?.codigo_credito || ''
    const amount = investment.monto_invertido
    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)

    const reasonText = reason ? `\n\nMotivo: ${reason}` : ''
    await supabase.from('notificaciones').insert({
      user_id: investment.inversionista_id,
      tipo: 'inversion_rechazada',
      titulo: 'Inversión Rechazada',
      mensaje: `Tu inversión de ${formattedAmount} en el crédito ${creditCode} ha sido rechazada.${reasonText}`,
      metadata: {
        investment_id: investmentId,
        credit_code: creditCode,
        amount,
        reason
      }
    })
  }

  revalidatePath('/dashboard/admin/inversiones')
  revalidatePath('/dashboard/admin/colocaciones')
  revalidatePath('/dashboard/inversionista/notificaciones')
  return { success: true }
}
