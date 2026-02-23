/**
 * Sistema de Causación Diaria de Intereses
 * Calculadora de intereses y distribución a inversionistas
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
import { FACTOR_MORA, DIAS_MES, ESTADOS_CREDITO_ACTIVO } from './types'
import { SupabaseClient } from '@supabase/supabase-js'

// ============================================
// Funciones de cálculo puro
// ============================================

/**
 * Calcula la tasa diaria efectiva desde la tasa nominal mensual
 * Fórmula: tasa_diaria = (1 + tasa_nominal/100)^(1/30) - 1
 */
export function calcularTasaDiaria(tasaNominalMensual: number): number {
  return Math.pow(1 + tasaNominalMensual / 100, 1 / DIAS_MES) - 1
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
 */
export function calcularInteresDiario(
  saldoCapital: number,
  tasaNominalMensual: number,
  diasMora: number
): CalculoInteresDiario {
  const tasaDiaria = calcularTasaDiaria(tasaNominalMensual)
  const interesDiario = Math.round(saldoCapital * tasaDiaria)

  // Mora: se cobra adicional si hay días de mora
  // Tasa mora = tasa nominal × factor de mora (1.5)
  let moraDiaria = 0
  if (diasMora > 0) {
    const tasaMoraDiaria = calcularTasaDiaria(tasaNominalMensual * FACTOR_MORA)
    moraDiaria = Math.round(saldoCapital * tasaMoraDiaria)
  }

  return {
    tasaDiaria,
    interesDiario,
    moraDiaria,
    diasMora
  }
}

/**
 * Distribuye el interés y mora entre los inversionistas según participación
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
    interes: Math.round(interesDiario * (inv.porcentaje_participacion / 100)),
    mora: Math.round(moraDiaria * (inv.porcentaje_participacion / 100))
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
  const { data, error } = await supabase
    .from('creditos')
    .select('*')
    .in('estado_credito', ESTADOS_CREDITO_ACTIVO)
    .gt('saldo_capital', 0)
    .or(`ultima_causacion.is.null,ultima_causacion.lt.${fechaHoy}`)
    .limit(limite)

  if (error) throw new Error(`Error obteniendo créditos: ${error.message}`)
  return data || []
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

    // 2. Calcular interés y mora diaria
    const calculo = calcularInteresDiario(
      credito.saldo_capital,
      credito.tasa_nominal,
      diasMora
    )

    resultado.interesCausado = calculo.interesDiario
    resultado.moraCausada = calculo.moraDiaria

    // 3. Insertar causación diaria
    const causacion: CausacionDiaria = {
      credito_id: credito.id,
      fecha_causacion: fechaHoy,
      saldo_base: credito.saldo_capital,
      tasa_nominal: credito.tasa_nominal,
      tasa_diaria: calculo.tasaDiaria,
      interes_causado: calculo.interesDiario,
      mora_causada: calculo.moraDiaria,
      dias_mora: diasMora
    }

    const { data: causacionInsertada, error: errorCausacion } = await supabase
      .from('causaciones_diarias')
      .insert(causacion)
      .select('id')
      .single()

    if (errorCausacion) throw new Error(`Error insertando causación: ${errorCausacion.message}`)

    // 4. Obtener inversiones activas
    const inversiones = await obtenerInversionesActivas(supabase, credito.id)

    if (inversiones.length > 0) {
      // 5. Distribuir entre inversionistas
      const distribuciones = distribuirEntreInversionistas(
        inversiones,
        calculo.interesDiario,
        calculo.moraDiaria
      )

      // 6. Insertar distribuciones a inversionistas
      const causacionesInversionistas: CausacionInversionista[] = distribuciones.map(dist => ({
        causacion_id: causacionInsertada.id,
        inversion_id: dist.inversionId,
        inversionista_id: dist.inversionistaId,
        credito_id: credito.id,
        fecha_causacion: fechaHoy,
        porcentaje_participacion: dist.porcentaje,
        interes_atribuido: dist.interes,
        mora_atribuida: dist.mora
      }))

      const { error: errorDistribucion } = await supabase
        .from('causaciones_inversionistas')
        .insert(causacionesInversionistas)

      if (errorDistribucion) throw new Error(`Error insertando distribución: ${errorDistribucion.message}`)

      // 7. Actualizar acumulados en inversiones
      for (const dist of distribuciones) {
        const inversion = inversiones.find(i => i.id === dist.inversionId)!
        await supabase
          .from('inversiones')
          .update({
            interes_acumulado: (inversion.interes_acumulado || 0) + dist.interes,
            mora_acumulada: (inversion.mora_acumulada || 0) + dist.mora,
            ultima_causacion: fechaHoy
          })
          .eq('id', dist.inversionId)
      }

      resultado.inversionistasActualizados = inversiones.length
    }

    // 8. Actualizar crédito
    await supabase
      .from('creditos')
      .update({
        saldo_intereses: (credito.saldo_intereses || 0) + calculo.interesDiario,
        saldo_mora: (credito.saldo_mora || 0) + calculo.moraDiaria,
        ultima_causacion: fechaHoy,
        dias_mora_actual: diasMora,
        interes_acumulado_total: (credito.interes_acumulado_total || 0) + calculo.interesDiario
      })
      .eq('id', credito.id)

    // 9. Registrar transacción de auditoría
    if (calculo.interesDiario > 0) {
      await supabase.from('transacciones').insert({
        credito_id: credito.id,
        tipo_transaccion: 'causacion_interes',
        concepto: `Causación diaria de interés - ${fechaHoy}`,
        monto: calculo.interesDiario,
        fecha_transaccion: new Date().toISOString(),
        fecha_aplicacion: fechaHoy,
        usuario_registro: 'SISTEMA_CRON'
      })
    }

    if (calculo.moraDiaria > 0) {
      await supabase.from('transacciones').insert({
        credito_id: credito.id,
        tipo_transaccion: 'causacion_mora',
        concepto: `Causación diaria de mora (${diasMora} días) - ${fechaHoy}`,
        monto: calculo.moraDiaria,
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
