/**
 * Calculo de amortizacion francesa (capital fijo constante, capital creciente).
 * Se usa en el cron para reducir capital_esperado en el dia de pago segun
 * la amortizacion teorica, en vez de depender de monto_pago_esperado que
 * puede estar mal configurado.
 */

/**
 * Cuota fija francesa.
 * Formula standard: C = P × i / (1 - (1+i)^(-n))
 */
export function calcularCuotaFrancesa(
  principal: number,
  tasaMensual: number,
  plazo: number
): number {
  if (tasaMensual === 0) return principal / plazo
  return (principal * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazo))
}

/**
 * Capital del periodo k (1-indexed) en amortizacion francesa.
 * En francesa, el capital crece geometricamente: capital_k = capital_1 × (1+i)^(k-1)
 *
 * Derivacion:
 *   saldo_inicio_k = P × (1+i)^(k-1) - cuota × ((1+i)^(k-1) - 1) / i
 *   interes_k      = saldo_inicio_k × i
 *   capital_k      = cuota - interes_k
 */
export function calcularCapitalPeriodo(
  principal: number,
  tasaMensual: number,
  plazo: number,
  periodo: number
): number {
  if (periodo < 1 || periodo > plazo) return 0
  if (tasaMensual === 0) return principal / plazo

  const cuotaFija = calcularCuotaFrancesa(principal, tasaMensual, plazo)
  const factor = Math.pow(1 + tasaMensual, periodo - 1)
  const saldoInicio = principal * factor - (cuotaFija * (factor - 1)) / tasaMensual
  const interesPeriodo = saldoInicio * tasaMensual
  return Math.max(0, cuotaFija - interesPeriodo)
}

/**
 * Determina el numero de periodo del dia de pago basado en la fecha actual
 * respecto a la fecha de desembolso.
 *
 * Para VENCIDA: primer periodo es 1 mes despues del desembolso → periodo 1
 * Para ANTICIPADA: primer periodo es en el desembolso (periodo 0), cuota
 *   paga interes anticipado sobre capital inicial. Luego periodo 1 = un mes.
 *
 * Returns 0 si es el dia del desembolso (solo relevante para anticipada).
 * Returns N >= 1 si estamos en el N-esimo dia de pago tras el desembolso.
 */
export function calcularPeriodoPago(
  fechaDesembolso: Date,
  fechaActual: Date
): number {
  const years = fechaActual.getFullYear() - fechaDesembolso.getFullYear()
  const months = fechaActual.getMonth() - fechaDesembolso.getMonth()
  return years * 12 + months
}
