/**
 * Sistema de Causación Diaria de Intereses
 * Calculadora de intereses y distribución a inversionistas
 *
 * REGLAS DE CÁLCULO (verificadas con Excel SFC - Lógica de Liquidación):
 *
 * DOS CAPITALES PARALELOS:
 * - CAPITAL ESPERADO: Capital si pagos se hicieran a tiempo (base para Int. Corriente)
 * - CAPITAL REAL: Capital acumulado actual (crece con intereses no pagados)
 *
 * CÁLCULOS:
 * - La causación empieza el día DESPUÉS del desembolso
 * - Int. Corriente = Capital ESPERADO × Tasa Diaria (NO sobre Capital Real)
 * - Int. Moratorio = Capital ESPERADO × Tasa Mora (SIEMPRE se calcula, incluso sin mora)
 * - Tasa Diaria = (1 + Tasa_EA/100)^(1/365) - 1 → redondeada a 4 decimales (0.0619%)
 * - Tasa Mora = Tasa de Usura SFC vigente por mes
 *
 * PAGOS:
 * - FECHA PAGO: día del mes igual al día de desembolso
 * - MONTO ESPERADO: pago mensual de intereses
 * - En fecha de pago, Capital Esperado se reduce por el monto esperado
 * - Capital Real solo se reduce con pagos reales (ABONO)
 *
 * MORA:
 * - EN MORA = true cuando no se paga en la fecha de pago
 * - MONTO PARA COLOCARSE = Capital Real - Capital Esperado (cuando en mora)
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
import { DIAS_ANIO, ESTADOS_CREDITO_EXCLUIDOS, TASAS_USURA_SFC, TASA_USURA_DEFAULT } from './types'
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
 * Calcula la fecha del próximo pago esperado
 * El día de pago es el mismo día del mes que el desembolso
 */
export function calcularFechaProximoPago(
  fechaDesembolso: string,
  fechaActual: Date
): Date {
  const desembolso = new Date(fechaDesembolso)
  const diaPago = desembolso.getDate()

  // Encontrar el próximo día de pago
  let proximoPago = new Date(fechaActual)
  proximoPago.setDate(diaPago)

  // Si ya pasó este mes, ir al siguiente
  if (proximoPago <= fechaActual) {
    proximoPago.setMonth(proximoPago.getMonth() + 1)
  }

  // Ajustar si el día no existe en ese mes
  const ultimoDiaMes = new Date(
    proximoPago.getFullYear(),
    proximoPago.getMonth() + 1,
    0
  ).getDate()
  proximoPago.setDate(Math.min(diaPago, ultimoDiaMes))

  return proximoPago
}

/**
 * Verifica si hoy es día de pago
 */
export function esDiaDePago(
  fechaDesembolso: string,
  fechaActual: Date
): boolean {
  const desembolso = new Date(fechaDesembolso)
  return fechaActual.getDate() === desembolso.getDate()
}

/**
 * Calcula los días de mora basado en fecha de último pago y fecha de vencimiento
 *
 * @param esAnticipada - Si true, el primer pago vence en la fecha de desembolso (no un mes después)
 */
export function calcularDiasMora(
  fechaUltimoPago: string | null,
  fechaDesembolso: string,
  fechaActual: Date,
  esAnticipada: boolean = false
): { diasMora: number; enMora: boolean; fechaVencimiento: Date | null } {
  // Día de pago = día del desembolso
  const desembolso = new Date(fechaDesembolso)
  const diaPago = desembolso.getDate()

  // Calcular el vencimiento más reciente
  let fechaVencimiento = new Date(fechaActual)
  fechaVencimiento.setDate(diaPago)

  // Si el día de pago de este mes aún no llega, el vencimiento es del mes anterior
  if (fechaVencimiento > fechaActual) {
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() - 1)
  }

  // Ajustar si el día no existe en ese mes
  const ultimoDiaMes = new Date(
    fechaVencimiento.getFullYear(),
    fechaVencimiento.getMonth() + 1,
    0
  ).getDate()
  fechaVencimiento.setDate(Math.min(diaPago, ultimoDiaMes))

  // Si no hay fecha de último pago, verificar si ya pasó el primer vencimiento
  if (!fechaUltimoPago) {
    // Anticipada: primer pago vence en la fecha de desembolso
    // Vencida: primer pago vence un mes después del desembolso
    const primerVencimiento = new Date(desembolso)
    if (!esAnticipada) {
      primerVencimiento.setMonth(primerVencimiento.getMonth() + 1)
    }

    if (fechaActual > primerVencimiento) {
      const diffTime = fechaActual.getTime() - primerVencimiento.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      return { diasMora: diffDays, enMora: true, fechaVencimiento: primerVencimiento }
    }
    return { diasMora: 0, enMora: false, fechaVencimiento: null }
  }

  // Verificar si el último pago cubre el vencimiento más reciente
  const ultimoPago = new Date(fechaUltimoPago)

  if (ultimoPago >= fechaVencimiento) {
    // Pago al día
    return { diasMora: 0, enMora: false, fechaVencimiento }
  }

  // Calcular días de mora desde el vencimiento no cubierto
  // El vencimiento no cubierto es el del mes siguiente al último pago
  const vencimientoNoCubierto = new Date(ultimoPago)
  vencimientoNoCubierto.setMonth(vencimientoNoCubierto.getMonth() + 1)
  vencimientoNoCubierto.setDate(Math.min(diaPago, new Date(
    vencimientoNoCubierto.getFullYear(),
    vencimientoNoCubierto.getMonth() + 1,
    0
  ).getDate()))

  if (fechaActual > vencimientoNoCubierto) {
    const diffTime = fechaActual.getTime() - vencimientoNoCubierto.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return { diasMora: diffDays, enMora: true, fechaVencimiento: vencimientoNoCubierto }
  }

  return { diasMora: 0, enMora: false, fechaVencimiento: null }
}

/**
 * Calcula el interés y mora diaria para un crédito (Lógica Excel)
 *
 * IMPORTANTE (diferencias con lógica anterior):
 * - Int. Corriente: se calcula sobre CAPITAL ESPERADO (no Real)
 * - Int. Moratorio Potencial: SIEMPRE se calcula (incluso sin mora)
 * - Int. Moratorio: solo se cobra cuando enMora = true
 * - Monto para colocarse: Capital Real - Capital Esperado
 *
 * @param capitalEsperado - Capital si pagos a tiempo (base para Int. Corriente)
 * @param capitalReal - Capital real acumulado
 * @param tasaNominalEA - Tasa EA del crédito
 * @param tasaUsuraEA - Tasa de usura SFC vigente
 * @param diasMora - Días de mora actuales
 * @param enMora - Si el crédito está actualmente en mora
 */
export function calcularInteresDiario(
  capitalEsperado: number,
  capitalReal: number,
  tasaNominalEA: number,
  tasaUsuraEA: number,
  diasMora: number,
  enMora: boolean = false
): CalculoInteresDiario {
  // Tasa diaria corriente (del crédito)
  const tasaDiaria = calcularTasaDiaria(tasaNominalEA)

  // Tasa diaria de mora (usura SFC)
  const tasaMoraDiaria = calcularTasaDiaria(tasaUsuraEA)

  // Int. Corriente: sobre CAPITAL ESPERADO (no Real) - Lógica Excel
  const interesDiario = capitalEsperado * tasaDiaria

  // Int. Moratorio Potencial: SIEMPRE se calcula sobre Capital Esperado
  // Esto muestra el costo potencial de no pagar
  const interesMoratorioPotencial = capitalEsperado * tasaMoraDiaria

  // Int. Moratorio efectivo: solo cuando está en mora
  const moraDiaria = enMora ? interesMoratorioPotencial : 0

  // Monto para colocarse al día: diferencia entre Real y Esperado
  const montoParaColocarse = capitalReal - capitalEsperado

  return {
    tasaDiaria,
    tasaMoraDiaria,
    interesDiario,
    moraDiaria,
    interesMoratorioPotencial,
    diasMora,
    capitalEsperado,
    capitalReal,
    enMora,
    montoParaColocarse
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
 * Obtiene créditos que necesitan causación diaria.
 * Filtro principal: fecha_desembolso existe y < hoy, saldo_capital > 0.
 * Excluye estados terminales (pagado, anulado, castigado).
 */
export async function obtenerCreditosPendientes(
  supabase: SupabaseClient,
  fechaHoy: string,
  limite: number = 50
): Promise<Credito[]> {
  // Construir filtro NOT IN para estados excluidos
  const { data, error } = await supabase
    .from('creditos')
    .select('*')
    .not('estado_credito', 'in', `(${ESTADOS_CREDITO_EXCLUIDOS.join(',')})`)
    .gt('saldo_capital', 0)
    .not('fecha_desembolso', 'is', null)
    .lt('fecha_desembolso', fechaHoy)  // Causación empieza día después de desembolso
    .or(`ultima_causacion.is.null,ultima_causacion.lt.${fechaHoy}`)
    .limit(limite)

  if (error) throw new Error(`Error obteniendo créditos: ${error.message}`)
  return data || []
}

/**
 * Obtiene los capitales del día anterior para un crédito
 * Si no existe causación anterior, retorna null
 */
export async function obtenerCapitalesAnteriores(
  supabase: SupabaseClient,
  creditoId: string,
  fechaHoy: string
): Promise<{ capitalEsperado: number; capitalReal: number } | null> {
  const { data, error } = await supabase
    .from('causaciones_diarias')
    .select('capital_esperado, capital_real')
    .eq('credito_id', creditoId)
    .lt('fecha_causacion', fechaHoy)
    .order('fecha_causacion', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null // No hay causación anterior
  }

  return {
    capitalEsperado: data.capital_esperado,
    capitalReal: data.capital_real
  }
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
 * Procesa la causación diaria para un crédito individual (Lógica Excel)
 *
 * Maneja dos capitales paralelos:
 * - Capital Esperado: base para cálculo de intereses, se reduce en fechas de pago
 * - Capital Real: capital acumulado, solo se reduce con pagos reales
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
    const fechaActual = new Date(fechaHoy)

    // Determinar tipo de crédito
    const esAnticipada = (credito.tipo_liquidacion || 'vencida') === 'anticipada'
    const esSoloInteres = (credito.tipo_amortizacion || 'francesa') === 'solo_interes'

    // 1. Obtener capitales del día anterior o usar valores iniciales
    const capitalesAnteriores = await obtenerCapitalesAnteriores(supabase, credito.id, fechaHoy)

    let capitalEsperado: number
    let capitalReal: number

    if (capitalesAnteriores) {
      capitalEsperado = capitalesAnteriores.capitalEsperado
      capitalReal = capitalesAnteriores.capitalReal
    } else {
      // Primer día: ambos capitales son iguales al capital inicial
      capitalEsperado = credito.saldo_capital_esperado || credito.saldo_capital
      capitalReal = credito.saldo_capital
    }

    // 2. Calcular días de mora y estado (anticipada: primer pago vence al desembolso)
    const moraInfo = calcularDiasMora(
      credito.fecha_ultimo_pago || null,
      credito.fecha_desembolso,
      fechaActual,
      esAnticipada
    )

    // 3. Verificar si hoy es día de pago esperado
    const esPagoDia = esDiaDePago(credito.fecha_desembolso, fechaActual)
    const montoEsperado = credito.monto_pago_esperado || 0

    // Si es día de pago, reducir el capital esperado (excepto solo_interes: capital se paga al vencimiento)
    if (esPagoDia && montoEsperado > 0 && !esSoloInteres) {
      capitalEsperado = Math.max(0, capitalEsperado - montoEsperado)
    }

    // 4. Obtener tasa de usura vigente
    const tasaUsura = await obtenerTasaUsuraDB(supabase, fechaHoy)

    // 5. Calcular interés y mora diaria (lógica Excel)
    // Usar tasa_interes_ea si está disponible, sino derivar de tasa_nominal mensual
    const tasaEA = credito.tasa_interes_ea || ((Math.pow(1 + credito.tasa_nominal / 100, 12) - 1) * 100)
    const calculo = calcularInteresDiario(
      capitalEsperado,              // Base para Int. Corriente
      capitalReal,                  // Capital real acumulado
      tasaEA,                       // Tasa EA del crédito
      tasaUsura,                    // Tasa usura SFC
      moraInfo.diasMora,
      moraInfo.enMora
    )

    // Redondear para guardar en DB
    const interesDiarioRedondeado = redondearPeso(calculo.interesDiario)
    const moraDiariaRedondeada = redondearPeso(calculo.moraDiaria)
    const moratorioPotencialRedondeado = redondearPeso(calculo.interesMoratorioPotencial)
    const montoParaColocarseRedondeado = redondearPeso(calculo.montoParaColocarse)

    resultado.interesCausado = interesDiarioRedondeado
    resultado.moraCausada = moraDiariaRedondeada

    // 6. Actualizar capitales para el día siguiente
    // Capital Esperado crece con interés calculado
    const nuevoCapitalEsperado = capitalEsperado + interesDiarioRedondeado
    // Capital Real también crece con interés
    const nuevoCapitalReal = capitalReal + interesDiarioRedondeado

    // 7. Insertar causación diaria
    const causacion: CausacionDiaria = {
      credito_id: credito.id,
      fecha_causacion: fechaHoy,
      capital_esperado: capitalEsperado,
      capital_real: capitalReal,
      tasa_nominal: credito.tasa_nominal,
      tasa_diaria: calculo.tasaDiaria,
      tasa_mora_diaria: calculo.tasaMoraDiaria,
      interes_causado: interesDiarioRedondeado,
      mora_causada: moraDiariaRedondeada,
      interes_moratorio_potencial: moratorioPotencialRedondeado,
      dias_mora: moraInfo.diasMora,
      en_mora: moraInfo.enMora,
      monto_para_colocarse: montoParaColocarseRedondeado
    }

    const { data: causacionInsertada, error: errorCausacion } = await supabase
      .from('causaciones_diarias')
      .insert(causacion)
      .select('id')
      .single()

    if (errorCausacion) throw new Error(`Error insertando causación: ${errorCausacion.message}`)

    // 8. Obtener y procesar inversiones activas
    const inversiones = await obtenerInversionesActivas(supabase, credito.id)

    if (inversiones.length > 0) {
      const distribuciones = distribuirEntreInversionistas(
        inversiones,
        calculo.interesDiario,
        calculo.moraDiaria
      )

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

    // 9. Actualizar crédito con ambos capitales
    await supabase
      .from('creditos')
      .update({
        saldo_capital: nuevoCapitalReal,
        saldo_capital_esperado: nuevoCapitalEsperado,
        saldo_capital_anterior: capitalReal,
        saldo_intereses: (credito.saldo_intereses || 0) + interesDiarioRedondeado,
        saldo_mora: (credito.saldo_mora || 0) + moraDiariaRedondeada,
        ultima_causacion: fechaHoy,
        dias_mora_actual: moraInfo.diasMora,
        en_mora: moraInfo.enMora,
        interes_acumulado_total: (credito.interes_acumulado_total || 0) + interesDiarioRedondeado
      })
      .eq('id', credito.id)

    // 10. Registrar transacciones de auditoría
    if (interesDiarioRedondeado > 0) {
      await supabase.from('transacciones').insert({
        credito_id: credito.id,
        tipo_transaccion: 'causacion_interes',
        concepto: `Causación diaria - ${fechaHoy} | Cap.Esp: $${capitalEsperado.toLocaleString()} | Tasa: ${(calculo.tasaDiaria * 100).toFixed(4)}%`,
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
        concepto: `Mora (${moraInfo.diasMora} días) - ${fechaHoy} | Tasa Usura: ${(calculo.tasaMoraDiaria * 100).toFixed(4)}%`,
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
