import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

type EventName =
  // Propietario
  | 'solicitud_iniciada'
  | 'solicitud_enviada'
  | 'ver_mis_creditos'
  | 'ver_mis_solicitudes'
  | 'ver_plan_pagos'
  | 'ver_notificaciones'
  // Inversionista
  | 'ver_marketplace'
  | 'ver_credito_detalle'
  | 'inversion_iniciada'
  | 'inversion_completada'
  | 'ver_mis_inversiones'
  | 'ver_inversion_detalle'
  // Comunes
  | 'login'
  | 'logout'

interface LogEventOptions {
  event: EventName | string
  metadata?: Record<string, unknown>
  path?: string
}

/**
 * Registra un evento de usuario desde una server action o server component.
 * Obtiene automáticamente el user_id, role, IP y user agent.
 * No lanza errores — los eventos no deben bloquear la operación del negocio.
 */
export async function logEvent({ event, metadata = {}, path }: LogEventOptions): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let role: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      role = profile?.role ?? null
    }

    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
      || headersList.get('x-real-ip')
      || null
    const userAgent = headersList.get('user-agent') || null

    await supabase.from('user_events').insert({
      user_id: user?.id ?? null,
      role,
      event,
      source: 'server',
      metadata,
      path: path ?? null,
      ip_address: ip,
      user_agent: userAgent,
    })
  } catch (err) {
    console.error('[analytics] logEvent failed:', err)
  }
}
