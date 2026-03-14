'use server'

import { createClient } from '../../../../utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Notificacion {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export async function getNotifications(): Promise<{ data: Notificacion[]; error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'No autenticado' }

  const { data, error } = await supabase
    .from('notificaciones')
    .select('id, tipo, titulo, mensaje, leida, metadata, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching notifications:', error.message)
    return { data: [], error: error.message }
  }

  return { data: data as Notificacion[], error: null }
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('leida', false)

  if (error) {
    console.error('Error fetching unread count:', error.message)
    return 0
  }

  return count || 0
}

export async function markAsRead(notificationId: string): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error marking notification as read:', error.message)
    return { success: false }
  }

  revalidatePath('/dashboard/inversionista/notificaciones')
  return { success: true }
}

export async function markAllAsRead(): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('user_id', user.id)
    .eq('leida', false)

  if (error) {
    console.error('Error marking all as read:', error.message)
    return { success: false }
  }

  revalidatePath('/dashboard/inversionista/notificaciones')
  return { success: true }
}
