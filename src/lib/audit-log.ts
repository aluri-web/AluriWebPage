import { createClient } from '../utils/supabase/server'
import { headers } from 'next/headers'

export type AuditAction =
  | 'loan.create'
  | 'loan.update'
  | 'loan.delete'
  | 'loan.approve'
  | 'loan.reject'
  | 'payment.register'
  | 'investment.approve'
  | 'investment.reject'
  | 'investment.create'
  | 'investment.remove'
  | 'user.create'
  | 'user.update'
  | 'credit.request'
  | 'document.upload'
  | 'document.delete'
  | 'admin.action'
  | 'session.login'
  | 'session.logout'

export type AuditResource =
  | 'credito'
  | 'inversion'
  | 'pago'
  | 'solicitud'
  | 'usuario'
  | 'documento'
  | 'sesion'

interface AuditLogEntry {
  action: AuditAction
  resource_type: AuditResource
  resource_id?: string
  details?: Record<string, unknown>
  user_id?: string
}

/**
 * Registra una entrada en el audit log.
 * Se ejecuta de forma async sin bloquear la operación principal.
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  'use server'
  try {
    const supabase = await createClient()

    // Obtener usuario actual si no se provee
    let userId = entry.user_id
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    }

    // Obtener IP del request
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
      || headersList.get('x-real-ip')
      || 'unknown'

    await supabase.from('audit_log').insert({
      user_id: userId || null,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id || null,
      details: entry.details || null,
      ip_address: ip,
    })
  } catch (error) {
    // Audit logging should never break the main flow
    console.error('[AUDIT] Error writing audit log:', error)
  }
}

/**
 * Versión para API routes (recibe el user_id directamente).
 * No depende de cookies/server actions.
 */
export function auditLogApi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  entry: AuditLogEntry & { ip_address?: string }
): void {
  // Fire and forget — no await
  supabase.from('audit_log').insert({
    user_id: entry.user_id || null,
    action: entry.action,
    resource_type: entry.resource_type,
    resource_id: entry.resource_id || null,
    details: entry.details || null,
    ip_address: entry.ip_address || 'api',
  }).then(() => {}).catch((err: Error) => {
    console.error('[AUDIT] Error writing audit log:', err)
  })
}
