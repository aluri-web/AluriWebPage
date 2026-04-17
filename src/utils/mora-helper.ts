/**
 * Calcula los dias de mora en vivo basandose en fechas del credito.
 * Mirror de src/lib/interest/calculator.ts:calcularDiasMora pero para uso en UI.
 *
 * Util cuando el campo dias_mora_actual en la DB esta desactualizado
 * (por ejemplo, si el cron de causaciones no ha corrido recientemente).
 */
export function calcularDiasMoraLive(
  fechaDesembolso: string | null | undefined,
  fechaUltimoPago: string | null | undefined,
  hoy: Date = new Date(),
  esAnticipada: boolean = false,
): { diasMora: number; enMora: boolean } {
  if (!fechaDesembolso) return { diasMora: 0, enMora: false }

  const desembolso = new Date(fechaDesembolso)
  const diaPago = desembolso.getDate()

  // Vencimiento mas reciente: hoy con dia ajustado a diaPago; si futuro, mes anterior
  const fechaVencimiento = new Date(hoy)
  fechaVencimiento.setDate(diaPago)
  if (fechaVencimiento > hoy) {
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() - 1)
  }
  const ultimoDiaMes = new Date(
    fechaVencimiento.getFullYear(),
    fechaVencimiento.getMonth() + 1,
    0,
  ).getDate()
  fechaVencimiento.setDate(Math.min(diaPago, ultimoDiaMes))

  // Sin pagos aun: verificar primer vencimiento
  if (!fechaUltimoPago) {
    const primerVencimiento = new Date(desembolso)
    if (!esAnticipada) {
      primerVencimiento.setMonth(primerVencimiento.getMonth() + 1)
    }
    if (hoy > primerVencimiento) {
      const diff = Math.floor(
        (hoy.getTime() - primerVencimiento.getTime()) / (1000 * 60 * 60 * 24),
      )
      return { diasMora: diff, enMora: true }
    }
    return { diasMora: 0, enMora: false }
  }

  const ultimoPago = new Date(fechaUltimoPago)

  // Si el ultimo pago cubre el vencimiento mas reciente: al dia
  if (ultimoPago >= fechaVencimiento) {
    return { diasMora: 0, enMora: false }
  }

  // Dias de mora desde el vencimiento no cubierto
  const vencimientoNoCubierto = new Date(ultimoPago)
  vencimientoNoCubierto.setMonth(vencimientoNoCubierto.getMonth() + 1)
  const ultDia = new Date(
    vencimientoNoCubierto.getFullYear(),
    vencimientoNoCubierto.getMonth() + 1,
    0,
  ).getDate()
  vencimientoNoCubierto.setDate(Math.min(diaPago, ultDia))

  if (hoy > vencimientoNoCubierto) {
    const diff = Math.floor(
      (hoy.getTime() - vencimientoNoCubierto.getTime()) / (1000 * 60 * 60 * 24),
    )
    return { diasMora: diff, enMora: true }
  }

  return { diasMora: 0, enMora: false }
}
