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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuracion del servidor incompleta.' }
  }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

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

  revalidatePath('/dashboard/admin/inversiones')
  revalidatePath('/dashboard/admin/colocaciones')
  return { success: true }
}

export async function rejectInvestment(investmentId: string): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuracion del servidor incompleta.' }
  }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  const { error } = await supabase
    .from('inversiones')
    .update({
      estado: 'rechazado',
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', investmentId)

  if (error) {
    console.error('Error rejecting investment:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/admin/inversiones')
  revalidatePath('/dashboard/admin/colocaciones')
  return { success: true }
}
