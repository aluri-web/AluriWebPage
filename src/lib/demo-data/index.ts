export { DEMO_USERS, type DemoUserProfile } from './users'
export { DEMO_CREDITOS, type DemoCredito } from './creditos'
export { DEMO_INVERSIONES, type DemoInversion } from './inversiones'
export { DEMO_TRANSACCIONES, type DemoTransaccion } from './transacciones'
export { DEMO_SOLICITUDES, type DemoSolicitud } from './solicitudes'
export { DEMO_NOTIFICACIONES, type DemoNotificacion } from './notificaciones'
export {
  DEMO_CONFIG,
  DEMO_ADMIN_PROFILE,
  DEMO_PROPIETARIO_PROFILE,
  DEMO_INVERSIONISTA_PROFILE,
  DEMO_TASAS,
  type DemoTasa,
} from './config'

// Helper: format COP currency
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Helper: format date
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
