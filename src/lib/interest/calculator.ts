/**
 * Sistema de Causación Diaria de Intereses
 * Calculadora de intereses y distribución a inversionistas
 *
 * REGLAS DE CÁLCULO (verificadas con Excel SFC):
 * - La causación empieza el día DESPUÉS del desembolso (no en la fecha de desembolso)
 * - Interés Corriente: Capital del día ACTUAL × Tasa Diaria
 * - Interés Moratorio: Capital del día ANTERIOR × Tasa Mora Diaria
 * - Tasa Diaria = (1 + Tasa_EA/100)^(1/365) - 1
 * - Tasa Mora = Tasa de Usura SFC vigente
 */

import type {
  Credito,
  Inversion,
  CalculoInteresDiario,
  DistribucionInversionista,
  CausacionDiaria,
  CausacionInversionista,
  ResultadoCausacion,
  ResumenEjecucion
} from './types'
import { DIAS_ANIO, ESTADOS_CREDITO_ACTIVO, TASAS_USURA_SFC, TASA_USURA_DEFAULT } from './types'
import { SupabaseClient } from '@supabase/supabase-js'

// ============================================
// Funciones de cálculo puro
// ============================================

/**
 * Precisión de Excel: IEEE 754 double-precision (15-17 dígitos significativos)
 * NO redondear durante cálculos intermedios - solo al final para guardar en DB
 */

/**
 * Calcula la tasa diaria efectiva desde la tasa EA (Efectiva Anual)
 * Fórmula: tasa_diaria = (1 + tasa_ea/100)^(1/365) - 1
 * Mantiene precisión completa de JavaScript (15+ dígitos)
 *
 * @param tasaEA - Tasa efectiva anual en porcentaje (ej: 25.34 para 25.34%)
 * @returns Tasa diaria en decimal con máxima precisión
 */
export function calcularTasaDiaria(tasaEA: number): number {
  // Mantener precisión completa - NO redondear
  return Math.pow(1 + tasaEA / 100, 1 / DIAS_ANIO) - 1
}

/**
 * Redondea al peso más cercano (sin centavos) - solo usar al final
 * Equivalente a ROUND(x, 0) en Excel
 */
export function redondearPeso(valor: number): number {
  return Math.round(valor)
}

/**
 * Obtiene la tasa de usura SFC para una fecha específica
 *
 * @param fecha - Fecha en formato YYYY-MM-DD
 * @returns Tasa de usura EA en porcentaje
 */
export function obtenerTasaUsura(fecha: string): number {
  const mesAnio = fecha.substring(0, 7) // "2026-02"
  return TASAS_USURA_SFC[mesAnio] || TASA_USURA_DEFAULT
}

/**
 * Obtiene la tasa de usura desde la base de datos
 */
export async function obtenerTasaUsuraDB(
  supabase: SupabaseClient,
  fecha: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('tasas_oficiales')
      .select('tasa_ea')
      .eq('tipo', 'usura_consumo')
      .lte('vigencia_desde', fecha)
      .gte('vigencia_hasta', fecha)
      .order('vigencia_desde', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return obtenerTasaUsura(fecha)
    }

    return data.tasa_ea
  } catch {
    return obtenerTasaUsura(fecha)
  }
}

/**
 * Calcula los días de mora basado en fecha de último pago y fecha de vencimiento
 */
export function calcularDiasMora(
  fechaUltimoPago: string | null,
  fechaDesembolso: string,
  fechaActual: Date
): number {
  if (!fechaUltimoPago) return 0

  // Día de pago = día del desembolso
  const desembolso = new Date(fechaDesembolso)
  const diaPago = desembolso.getDate()

  // Próximo vencimiento = fecha último pago + 1 mes
  const ultimoPago = new Date(fechaUltimoPago)
  const proximoVencimiento = new Date(ultimoPago)
  proximoVencimiento.setMonth(proximoVencimiento.getMonth() + 1)

  // Ajustar día de vencimiento (manejar meses con menos días)
  const ultimoDiaMes = new Date(
    proximoVencimiento.getFullYear(),
    proximoVencimiento.getMonth() + 1,
    0
  ).getDate()
  proximoVencimiento.setDate(Math.min(diaPago, ultimoDiaMes))

  // Calcular diferencia en días
  const diffTime = fechaActual.getTime() - proximoVencimiento.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return diffDays > 0 ? diffDays : 0
}

/**
 * Calcula el interés y mora diaria para un crédito
 * MANTIENE PRECISIÓN COMPLETA - NO redondea durante el cálculo
 *
 * IMPORTANTE:
 * - Interés Corriente: se calcula sobre el capital ACTUAL
 * - Interés Moratorio: se calcula sobre el capital del día ANTERIOR
 * - Los valores se devuelven con precisión completa (15+ dígitos)
 * - El redondeo se hace solo al guardar en la base de datos
 *
 * @param saldoCapital - Capital actual del crédito
 * @param saldoCapitalAnterior - Capital del día anterior (para mora)
 * @param tasaNominalEA - Tasa EA del crédito
 * @param tasaUsuraEA - Tasa de usura SFC vigente
 * @param diasMora - Días de mora actuales
 */
export function calcularInteresDiario(
  saldoCapital: number,
  saldoCapitalAnterior: number,
  tasaNominalEA: number,
  tasaUsuraEA: number,
  diasMora: number
): CalculoInteresDiario {
  // Tasa diaria corriente (del crédito) - precisión completa
  const tasaDiaria = calcularTasaDiaria(tasaNominalEA)

  // Tasa diaria de mora (usura SFC) - precisión completa
  const tasaMoraDiaria = calcularTasaDiaria(tasaUsuraEA)

  // Interés corriente: sobre capital ACTUAL - SIN redondear
  const interesDiario = saldoCapital * tasaDiaria

  // Mora: sobre capital ANTERIOR (solo si hay días de mora) - SIN redondear
  let moraDiaria = 0
  if (diasMora > 0) {
    moraDiaria = saldoCapitalAnterior * tasaMoraDiaria
  }

  return {
    tasaDiaria,
    tasaMoraDiaria,
    interesDiario,
    moraDiaria,
    diasMora
  }
}

/**
 * Distribuye el interés y mora entre los inversionistas según participación
 * MANTIENE PRECISIÓN COMPLETA - redondea solo al guardar en DB
 */
export function distribuirEntreInversionistas(
  inversiones: Inversion[],
  interesDiario: number,
  moraDiaria: number
): DistribucionInversionista[] {
  return inversiones.map(inv => ({
    inversionId: inv.id,
    inversionistaId: inv.inversionista_id,
    porcentaje: inv.porcentaje_participacion,
    // Precisión completa - el redondeo se hace al guardar en DB
    interes: interesDiario * (inv.porcentaje_participacion / 100),
    mora: moraDiaria * (inv.porcentaje_participacion / 100)
  }))
}

// ============================================
// Funciones de base de datos
// ============================================

/**
 * Obtiene créditos activos que no han sido procesados hoy
 */
export async function obtenerCreditosPendientes(
  supabase: SupabaseClient,
  fechaHoy: string,
  limite: number = 50
): Promise<Credito[]> {
  // Solo procesar créditos desembolsados ANTES de hoy
  // (la causación empieza el día DESPUÉS del desembolso)
  const { data, error } = await supabase
    .from('creditos')
    .select('*')
    .in('estado_credito', ESTADOS_CREDITO_ACTIVO)
    .gt('saldo_capital', 0)
    .lt('fecha_desembolso', fechaHoy)  // Solo créditos desembolsados antes de hoy
    .or(`ultima_causacion.is.null,ultima_causacion.lt.${fechaHoy}`)
    .limit(limite)

  if (error) throw new Error(`Error obteniendo créditos: ${error.message}`)
  return data || []
}

/**
 * Obtiene el capital del día anterior para un crédito
 * Si no existe causación anterior, usa el capital actual
 */
export async function obtenerCapitalAnterior(
  supabase: SupabaseClient,
  creditoId: string,
  fechaHoy: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('causaciones_diarias')
    .select('saldo_base')
    .eq('credito_id', creditoId)
    .lt('fecha_causacion', fechaHoy)
    .order('fecha_causacion', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null // No hay causación anterior
  }

  return data.saldo_base
}

/**
 * Obtiene inversiones activas para un crédito
 */
export async function obtenerInversionesActivas(
  supabase: SupabaseClient,
  creditoId: string
): Promise<Inversion[]> {
  const { data, error } = await supabase
    .from('inversiones')
    .select('*')
    .eq('credito_id', creditoId)
    .eq('estado', 'activo')

  if (error) throw new Error(`Error obteniendo inversiones: ${error.message}`)
  return data || []
}

/**
 * Procesa la causación diaria para un crédito individual
 */
export async function procesarCausacionCredito(
  supabase: SupabaseClient,
  credito: Credito,
  fechaHoy: string
): Promise<ResultadoCausacion> {
  const resultado: ResultadoCausacion = {
    creditoId: credito.id,
    codigoCredito: credito.codigo_credito,
    fecha: fechaHoy,
    interesCausado: 0,
    moraCausada: 0,
    inversionistasActualizados: 0
  }

  try {
    // 1. Calcular días de mora
    const diasMora = calcularDiasMora(
      credito.fecha_ultimo_pago || null,
      credito.fecha_desembolso,
      new Date(fechaHoy)
    )

    // 2. Obtener capital del día anterior (para mora)
    const capitalAnterior = await obtenerCapitalAnterior(supabase, credito.id, fechaHoy)
    const saldoCapitalAnterior = capitalAnterior ?? credito.saldo_capital

    // 3. Obtener tasa de usura vigente
    const tasaUsura = await obtenerTasaUsuraDB(supabase, fechaHoy)

    // 4. Calcular interés y mora diaria
    const calculo = calcularInteresDiario(
      credito.saldo_capital,      // Capital actual (para corriente)
      saldoCapitalAnterior,       // Capital anterior (para mora)
      credito.tasa_nominal,       // Tasa EA del crédito
      tasaUsura,                  // Tasa usura SFC
      diasMora
    )

    // Redondear solo para guardar en DB (precisión de pesos colombianos)
    const interesDiarioRedondeado = redondearPeso(calculo.interesDiario)
    const moraDiariaRedondeada = redondearPeso(calculo.moraDiaria)

    resultado.interesCausado = interesDiarioRedondeado
    resultado.moraCausada = moraDiariaRedondeada

    // 5. Insertar causación diaria (valores redondeados para DB)
    const causacion: CausacionDiaria = {
      credito_id: credito.id,
      fecha_causacion: fechaHoy,
      saldo_base: credito.saldo_capital,
      saldo_base_anterior: saldoCapitalAnterior,
      tasa_nominal: credito.tasa_nominal,
      tasa_diaria: calculo.tasaDiaria,  // Mantener precisión completa
      tasa_mora_diaria: calculo.tasaMoraDiaria,  // Mantener precisión completa
      interes_causado: interesDiarioRedondeado,
      mora_causada: moraDiariaRedondeada,
      dias_mora: diasMora
    }

    const { data: causacionInsertada, error: errorCausacion } = await supabase
      .from('causaciones_diarias')
      .insert(causacion)
      .select('id')
      .single()

    if (errorCausacion) throw new Error(`Error insertando causación: ${errorCausacion.message}`)

    // 6. Obtener inversiones activas
    const inversiones = await obtenerInversionesActivas(supabase, credito.id)

    if (inversiones.length > 0) {
      // 7. Distribuir entre inversionistas (con precisión completa)
      const distribuciones = distribuirEntreInversionistas(
        inversiones,
        calculo.interesDiario,
        calculo.moraDiaria
      )

      // 8. Insertar distribuciones a inversionistas (redondeando para DB)
      const causacionesInversionistas: CausacionInversionista[] = distribuciones.map(dist => ({
        causacion_id: causacionInsertada.id,
        inversion_id: dist.inversionId,
        inversionista_id: dist.inversionistaId,
        credito_id: credito.id,
        fecha_causacion: fechaHoy,
        porcentaje_participacion: dist.porcentaje,
        interes_atribuido: redondearPeso(dist.interes),
        mora_atribuida: redondearPeso(dist.mora)
      }))

      const { error: errorDistribucion } = await supabase
        .from('causaciones_inversionistas')
        .insert(causacionesInversionistas)

      if (errorDistribucion) throw new Error(`Error insertando distribución: ${errorDistribucion.message}`)

      // 9. Actualizar acumulados en inversiones (redondeando para DB)
      for (const dist of distribuciones) {
        const inversion = inversiones.find(i => i.id === dist.inversionId)!
        await supabase
          .from('inversiones')
          .update({
            interes_acumulado: (inversion.interes_acumulado || 0) + redondearPeso(dist.interes),
            mora_acumulada: (inversion.mora_acumulada || 0) + redondearPeso(dist.mora),
            ultima_causacion: fechaHoy
          })
          .eq('id', dist.inversionId)
      }

      resultado.inversionistasActualizados = inversiones.length
    }

    // 10. Actualizar crédito (usando valores redondeados para DB)
    // El nuevo capital = capital actual + interés corriente
    // (solo corriente se agrega al capital, mora se mantiene separada)
    const nuevoSaldoCapital = credito.saldo_capital + interesDiarioRedondeado

    await supabase
      .from('creditos')
      .update({
        saldo_capital: nuevoSaldoCapital,
        saldo_capital_anterior: credito.saldo_capital,
        saldo_intereses: (credito.saldo_intereses || 0) + interesDiarioRedondeado,
        saldo_mora: (credito.saldo_mora || 0) + moraDiariaRedondeada,
        ultima_causacion: fechaHoy,
        dias_mora_actual: diasMora,
        interes_acumulado_total: (credito.interes_acumulado_total || 0) + interesDiarioRedondeado
      })
      .eq('id', credito.id)

    // 11. Registrar transacción de auditoría (valores redondeados)
    if (interesDiarioRedondeado > 0) {
      await supabase.from('transacciones').insert({
        credito_id: credito.id,
        tipo_transaccion: 'causacion_interes',
        // Mostrar tasa con 10 decimales para auditoría (precisión Excel)
        concepto: `Causación diaria de interés - ${fechaHoy} (Tasa ${(calculo.tasaDiaria * 100).toFixed(10)}%)`,
        monto: interesDiarioRedondeado,
        fecha_transaccion: new Date().toISOString(),
        fecha_aplicacion: fechaHoy,
        usuario_registro: 'SISTEMA_CRON'
      })
    }

    if (moraDiariaRedondeada > 0) {
      await supabase.from('transacciones').insert({
        credito_id: credito.id,
        tipo_transaccion: 'causacion_mora',
        // Mostrar tasa con 10 decimales para auditoría (precisión Excel)
        concepto: `Causación diaria de mora (${diasMora} días) - ${fechaHoy} (Tasa Usura ${(calculo.tasaMoraDiaria * 100).toFixed(10)}%)`,
        monto: moraDiariaRedondeada,
        fecha_transaccion: new Date().toISOString(),
        fecha_aplicacion: fechaHoy,
        usuario_registro: 'SISTEMA_CRON'
      })
    }

  } catch (err) {
    resultado.error = err instanceof Error ? err.message : 'Error desconocido'
  }

  return resultado
}

/**
 * Ejecuta el proceso completo de causación diaria
 */
export async function ejecutarCausacionDiaria(
  supabase: SupabaseClient,
  fechaHoy?: string
): Promise<ResumenEjecucion> {
  const inicio = Date.now()
  const fecha = fechaHoy || new Date().toISOString().split('T')[0]

  const resumen: ResumenEjecucion = {
    fecha,
    creditosProcesados: 0,
    creditosExitosos: 0,
    creditosConError: 0,
    totalInteresCausado: 0,
    totalMoraCausada: 0,
    duracionMs: 0,
    resultados: []
  }

  try {
    // Obtener créditos pendientes (en batches de 50)
    const creditos = await obtenerCreditosPendientes(supabase, fecha, 50)
    resumen.creditosProcesados = creditos.length

    // Procesar cada crédito
    for (const credito of creditos) {
      const resultado = await procesarCausacionCredito(supabase, credito, fecha)
      resumen.resultados.push(resultado)

      if (resultado.error) {
        resumen.creditosConError++
      } else {
        resumen.creditosExitosos++
        resumen.totalInteresCausado += resultado.interesCausado
        resumen.totalMoraCausada += resultado.moraCausada
      }
    }

  } catch (err) {
    console.error('Error en causación diaria:', err)
  }

  resumen.duracionMs = Date.now() - inicio
  return resumen
}
