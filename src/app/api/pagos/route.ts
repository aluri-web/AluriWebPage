import { NextRequest, NextResponse } from 'next/server'
import { verificarAuth } from '@/lib/api-keys'

// Tipos para la API
interface SolicitudPago {
  credito_id: string
  fecha_pago: string
  monto: number // Monto total del pago — se distribuye automáticamente: mora → intereses → capital
}

/**
 * Calcula los meses de interés debidos entre dos fechas.
 * Replica la lógica de la función SQL public.months_of_interest_due()
 */
function monthsOfInterestDue(baseDate: Date, targetDate: Date, anticipada: boolean): number {
  let periods = (targetDate.getFullYear() - baseDate.getFullYear()) * 12
    + (targetDate.getMonth() - baseDate.getMonth())

  if (targetDate.getDate() >= baseDate.getDate()) {
    periods += 1
  }

  if (!anticipada) {
    periods -= 1
  }

  return Math.max(0, periods)
}

interface AplicacionPago {
  monto_mora: number
  monto_interes: number
  monto_capital: number
  saldo_mora_anterior: number
  saldo_intereses_anterior: number
  saldo_capital_anterior: number
  saldo_mora_nuevo: number
  saldo_intereses_nuevo: number
  saldo_capital_nuevo: number
}

interface PagoInversionista {
  inversionista_id: string
  nombre_inversionista: string
  porcentaje: number
  monto_interes: number
  monto_capital: number
  total: number
}

interface RespuestaPago {
  success: boolean
  pago_id?: string
  monto_total: number
  aplicacion?: AplicacionPago
  distribucion: PagoInversionista[]
  error?: string
}

/**
 * POST /api/pagos
 *
 * Registra un pago del propietario y calcula la distribución a los inversionistas.
 * El monto se distribuye automáticamente en cascada: mora → intereses → capital.
 *
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "credito_id": "uuid-del-credito" o "CR-001" (codigo_credito),
 *   "fecha_pago": "2026-02-20",
 *   "monto": 5000000
 * }
 *
 * Cascada de aplicación:
 * 1. Mora (hasta cubrir saldo_mora)
 * 2. Intereses (hasta cubrir saldo_intereses)
 * 3. Capital (el sobrante reduce saldo_capital)
 */
export async function POST(request: NextRequest): Promise<NextResponse<RespuestaPago>> {
  try {
    // Verificar autenticación admin
    const authResult = await verificarAuth(request, 'admin')
    if (!authResult.success || !authResult.supabase) {
      return NextResponse.json(
        { success: false, monto_total: 0, distribucion: [], error: authResult.error },
        { status: authResult.status || 500 }
      )
    }

    const supabase = authResult.supabase
    const body: SolicitudPago = await request.json()

    // Validaciones
    if (!body.credito_id) {
      return NextResponse.json(
        { success: false, monto_total: 0, distribucion: [], error: 'credito_id es requerido' },
        { status: 400 }
      )
    }

    if (!body.fecha_pago) {
      return NextResponse.json(
        { success: false, monto_total: 0, distribucion: [], error: 'fecha_pago es requerido' },
        { status: 400 }
      )
    }

    const montoTotal = body.monto || 0

    if (montoTotal <= 0) {
      return NextResponse.json(
        { success: false, monto_total: 0, distribucion: [], error: 'El monto debe ser mayor a cero' },
        { status: 400 }
      )
    }

    // Verificar que el crédito existe (buscar por ID o por codigo_credito)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.credito_id)

    const { data: credito, error: creditoError } = await supabase
      .from('creditos')
      .select('id, codigo_credito, cliente_id, monto_solicitado, saldo_capital, saldo_intereses, saldo_mora, tasa_nominal, tipo_liquidacion, tipo_amortizacion, valor_colocado, fecha_desembolso, fecha_ultimo_pago, plazo')
      .eq(isUUID ? 'id' : 'codigo_credito', body.credito_id)
      .single()

    if (creditoError || !credito) {
      return NextResponse.json(
        { success: false, monto_total: 0, distribucion: [], error: 'Crédito no encontrado' },
        { status: 404 }
      )
    }

    const creditoId = credito.id
    const montoCredito = credito.monto_solicitado || 0

    // =========================================
    // RECALCULAR saldo_intereses EN TIEMPO REAL
    // (misma lógica que el cron SQL calcular_mora_diaria)
    // =========================================
    const tasaNominal = credito.tasa_nominal || 0
    const esAnticipada = (credito.tipo_liquidacion || 'vencida') === 'anticipada'
    const esSoloInteres = (credito.tipo_amortizacion || 'francesa') === 'solo_interes'
    const principal = credito.valor_colocado || credito.monto_solicitado || 0
    const fechaPago = new Date(body.fecha_pago + 'T12:00:00') // Usar fecha del pago como referencia

    let saldoInteresesCalculado = 0

    if (tasaNominal > 0 && credito.fecha_desembolso) {
      if (esSoloInteres) {
        // SOLO INTERES: los pagos cubren intereses del plazo COMPLETO antes de tocar capital
        // Total intereses previstos = plazo * cuota_mensual_interes
        const plazoMeses = credito.plazo || 12
        const totalInterestForTerm = plazoMeses * (principal * tasaNominal / 100)

        // Sumar todos los pagos de interés ya registrados
        const { data: interestPayments } = await supabase
          .from('transacciones')
          .select('monto')
          .eq('credito_id', creditoId)
          .eq('tipo_transaccion', 'pago_interes')

        const totalInterestPaid = (interestPayments || []).reduce((sum, t) => sum + (t.monto || 0), 0)
        saldoInteresesCalculado = Math.max(0, Math.round(totalInterestForTerm - totalInterestPaid))
      } else {
        // FRANCESA: desde último pago de interés (o desembolso)
        const { data: lastInterestPayment } = await supabase
          .from('transacciones')
          .select('fecha_transaccion')
          .eq('credito_id', creditoId)
          .eq('tipo_transaccion', 'pago_interes')
          .order('fecha_transaccion', { ascending: false })
          .limit(1)
          .maybeSingle()

        const baseDate = lastInterestPayment?.fecha_transaccion
          ? new Date(lastInterestPayment.fecha_transaccion + 'T12:00:00')
          : new Date(credito.fecha_desembolso + 'T12:00:00')

        const monthsDue = monthsOfInterestDue(baseDate, fechaPago, esAnticipada)
        saldoInteresesCalculado = Math.round(
          monthsDue * ((credito.saldo_capital || 0) * tasaNominal / 100)
        )
      }
    }

    // =========================================
    // RECALCULAR saldo_mora SEGÚN FECHA DEL PAGO
    // Usa tasa de usura SFC (EA → diaria)
    // =========================================
    let saldoMoraCalculado = 0

    if (credito.fecha_ultimo_pago && credito.fecha_desembolso) {
      const fechaUltimoPago = new Date(credito.fecha_ultimo_pago + 'T12:00:00')
      const diaPago = new Date(credito.fecha_desembolso + 'T12:00:00').getDate()

      // Calcular próximo vencimiento = fecha_ultimo_pago + 1 mes, ajustado al día de pago
      const proximoVencimiento = new Date(fechaUltimoPago)
      proximoVencimiento.setMonth(proximoVencimiento.getMonth() + 1)
      const lastDayOfMonth = new Date(proximoVencimiento.getFullYear(), proximoVencimiento.getMonth() + 1, 0).getDate()
      proximoVencimiento.setDate(Math.min(diaPago, lastDayOfMonth))

      if (fechaPago > proximoVencimiento) {
        const diasMora = Math.floor((fechaPago.getTime() - proximoVencimiento.getTime()) / (1000 * 60 * 60 * 24))

        // Obtener tasa de usura vigente de la SFC para la fecha del pago
        const { data: tasaRow } = await supabase
          .from('tasas_oficiales')
          .select('tasa_ea')
          .eq('tipo', 'usura_consumo')
          .lte('vigencia_desde', body.fecha_pago)
          .gte('vigencia_hasta', body.fecha_pago)
          .order('vigencia_desde', { ascending: false })
          .limit(1)
          .maybeSingle()

        const tasaUsuraEA = tasaRow?.tasa_ea || 24.36 // Fallback SFC
        const tasaMoraDiaria = Math.pow(1 + tasaUsuraEA / 100, 1 / 365) - 1

        saldoMoraCalculado = Math.round((credito.saldo_capital || 0) * tasaMoraDiaria * diasMora)
      }
    }

    // =========================================
    // CASCADA: mora → intereses → capital
    // Usa saldo_intereses y saldo_mora RECALCULADOS, no los guardados
    // =========================================
    const saldoMoraAnterior = saldoMoraCalculado
    const saldoInteresesAnterior = saldoInteresesCalculado
    const saldoCapitalAnterior = credito.saldo_capital || 0

    let restante = montoTotal

    // 1. Primero pagar mora
    const montoMora = Math.min(restante, saldoMoraAnterior)
    restante -= montoMora

    // 2. Luego pagar intereses
    const montoInteres = Math.min(restante, saldoInteresesAnterior)
    restante -= montoInteres

    // 3. El sobrante va a capital
    const montoCapital = Math.min(restante, saldoCapitalAnterior)
    restante -= montoCapital

    // Nuevos saldos
    const nuevoSaldoMora = saldoMoraAnterior - montoMora
    const nuevoSaldoIntereses = saldoInteresesAnterior - montoInteres
    const nuevoSaldoCapital = saldoCapitalAnterior - montoCapital

    const aplicacion: AplicacionPago = {
      monto_mora: montoMora,
      monto_interes: montoInteres,
      monto_capital: montoCapital,
      saldo_mora_anterior: saldoMoraAnterior,
      saldo_intereses_anterior: saldoInteresesAnterior,
      saldo_capital_anterior: saldoCapitalAnterior,
      saldo_mora_nuevo: nuevoSaldoMora,
      saldo_intereses_nuevo: nuevoSaldoIntereses,
      saldo_capital_nuevo: nuevoSaldoCapital,
    }

    // Obtener las inversiones activas para este crédito
    const { data: inversiones, error: inversionesError } = await supabase
      .from('inversiones')
      .select(`
        id,
        inversionista_id,
        monto_invertido,
        inversionista:profiles!inversionista_id (
          id,
          full_name,
          email
        )
      `)
      .eq('credito_id', creditoId)
      .eq('estado', 'activo')

    if (inversionesError) {
      console.error('Error fetching inversiones:', inversionesError)
      return NextResponse.json(
        { success: false, monto_total: 0, distribucion: [], error: 'Error al obtener inversiones' },
        { status: 500 }
      )
    }

    // Calcular la distribución a cada inversionista (solo intereses + capital)
    const distribucion: PagoInversionista[] = (inversiones || []).map(inversion => {
      const porcentaje = montoCredito > 0
        ? (inversion.monto_invertido / montoCredito) * 100
        : 0

      const inversionistaData = inversion.inversionista as unknown as {
        id: string;
        full_name: string | null;
        email: string | null
      } | null

      const interesInversionista = Math.round((montoInteres * porcentaje) / 100)
      const capitalInversionista = Math.round((montoCapital * porcentaje) / 100)

      return {
        inversionista_id: inversion.inversionista_id,
        nombre_inversionista: inversionistaData?.full_name || 'Sin nombre',
        porcentaje: Math.round(porcentaje * 100) / 100,
        monto_interes: interesInversionista,
        monto_capital: capitalInversionista,
        total: interesInversionista + capitalInversionista
      }
    })

    // Registrar transacciones individuales por tipo
    const referenciaPago = `PAG-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const filasTransaccion: {
      credito_id: string;
      tipo_transaccion: string;
      monto: number;
      fecha_aplicacion: string;
      fecha_transaccion: string;
      referencia_pago: string;
    }[] = []

    if (montoMora > 0) {
      filasTransaccion.push({
        credito_id: creditoId,
        tipo_transaccion: 'pago_mora',
        monto: montoMora,
        fecha_aplicacion: body.fecha_pago,
        fecha_transaccion: body.fecha_pago,
        referencia_pago: referenciaPago
      })
    }

    if (montoInteres > 0) {
      filasTransaccion.push({
        credito_id: creditoId,
        tipo_transaccion: 'pago_interes',
        monto: montoInteres,
        fecha_aplicacion: body.fecha_pago,
        fecha_transaccion: body.fecha_pago,
        referencia_pago: referenciaPago
      })
    }

    if (montoCapital > 0) {
      filasTransaccion.push({
        credito_id: creditoId,
        tipo_transaccion: 'pago_capital',
        monto: montoCapital,
        fecha_aplicacion: body.fecha_pago,
        fecha_transaccion: body.fecha_pago,
        referencia_pago: referenciaPago
      })
    }

    if (filasTransaccion.length > 0) {
      const { error: txError } = await supabase
        .from('transacciones')
        .insert(filasTransaccion)

      if (txError) {
        console.error('Error registering payment:', txError)
        return NextResponse.json(
          { success: false, monto_total: 0, distribucion: [], error: 'Error al registrar el pago: ' + txError.message },
          { status: 500 }
        )
      }
    }

    // Actualizar saldos en la tabla creditos
    const updateData: Record<string, unknown> = {
      saldo_capital: nuevoSaldoCapital,
      saldo_intereses: nuevoSaldoIntereses,
      saldo_mora: nuevoSaldoMora,
      fecha_ultimo_pago: body.fecha_pago,
    }

    // Si el capital quedó en 0, marcar como pagado
    if (nuevoSaldoCapital === 0) {
      updateData.estado_credito = 'pagado'
      updateData.en_mora = false
      updateData.saldo_mora = 0
    }

    const { error: updateError } = await supabase
      .from('creditos')
      .update(updateData)
      .eq('id', creditoId)

    if (updateError) {
      console.error('Error actualizando saldos del crédito:', updateError)
    }

    return NextResponse.json({
      success: true,
      pago_id: referenciaPago,
      monto_total: montoTotal,
      aplicacion,
      distribucion
    })

  } catch (error) {
    console.error('Error in pagos API:', error)
    return NextResponse.json(
      { success: false, monto_total: 0, distribucion: [], error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/pagos?credito_id=uuid
 *
 * Obtiene el historial de pagos de un crédito con la distribución a inversionistas.
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 *
 * DB: creditos + transacciones + inversiones
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verificar autenticación admin
    const authResult = await verificarAuth(request, 'admin')
    if (!authResult.success || !authResult.supabase) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 500 }
      )
    }

    const supabase = authResult.supabase
    const { searchParams } = new URL(request.url)
    const creditoIdParam = searchParams.get('credito_id')

    if (!creditoIdParam) {
      return NextResponse.json(
        { success: false, error: 'credito_id es requerido como query parameter' },
        { status: 400 }
      )
    }

    // Buscar el crédito por ID o por codigo_credito
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creditoIdParam)

    const { data: credito, error: creditoError } = await supabase
      .from('creditos')
      .select('id, codigo_credito, monto_solicitado')
      .eq(isUUID ? 'id' : 'codigo_credito', creditoIdParam)
      .single()

    if (creditoError || !credito) {
      return NextResponse.json(
        { success: false, error: 'Crédito no encontrado' },
        { status: 404 }
      )
    }

    const creditoId = credito.id
    const montoCredito = credito.monto_solicitado || 0

    // Obtener las transacciones de pago del crédito
    const { data: transacciones, error: txError } = await supabase
      .from('transacciones')
      .select('id, tipo_transaccion, monto, fecha_aplicacion, referencia_pago, created_at')
      .eq('credito_id', creditoId)
      .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])
      .order('fecha_aplicacion', { ascending: false })

    if (txError) {
      console.error('Error fetching pagos:', txError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener pagos' },
        { status: 500 }
      )
    }

    // Agrupar transacciones por referencia_pago
    const gruposPago: Record<string, {
      id: string;
      fecha_pago: string;
      monto_capital: number;
      monto_interes: number;
      monto_mora: number;
      monto_total: number;
      created_at: string;
    }> = {}

    for (const tx of (transacciones || [])) {
      const ref = tx.referencia_pago || tx.id
      if (!gruposPago[ref]) {
        gruposPago[ref] = {
          id: ref,
          fecha_pago: tx.fecha_aplicacion,
          monto_capital: 0,
          monto_interes: 0,
          monto_mora: 0,
          monto_total: 0,
          created_at: tx.created_at
        }
      }
      const grupo = gruposPago[ref]
      if (tx.tipo_transaccion === 'pago_capital') grupo.monto_capital += tx.monto || 0
      else if (tx.tipo_transaccion === 'pago_interes') grupo.monto_interes += tx.monto || 0
      else if (tx.tipo_transaccion === 'pago_mora') grupo.monto_mora += tx.monto || 0
      grupo.monto_total = grupo.monto_capital + grupo.monto_interes + grupo.monto_mora
    }

    const pagos = Object.values(gruposPago)

    // Obtener las inversiones para calcular distribución
    const { data: inversiones } = await supabase
      .from('inversiones')
      .select(`
        inversionista_id,
        monto_invertido,
        inversionista:profiles!inversionista_id (
          full_name
        )
      `)
      .eq('credito_id', creditoId)
      .eq('estado', 'activo')

    // Añadir la distribución calculada a cada pago
    const pagosConDistribucion = pagos.map(pago => {
      const distribucion = (inversiones || []).map(inv => {
        const porcentaje = montoCredito > 0
          ? (inv.monto_invertido / montoCredito) * 100
          : 0
        const invData = inv.inversionista as unknown as { full_name: string | null } | null

        return {
          inversionista_id: inv.inversionista_id,
          nombre_inversionista: invData?.full_name || 'Sin nombre',
          porcentaje: Math.round(porcentaje * 100) / 100,
          monto_interes: Math.round((pago.monto_interes * porcentaje) / 100),
          monto_capital: Math.round((pago.monto_capital * porcentaje) / 100)
        }
      })

      return {
        ...pago,
        distribucion
      }
    })

    return NextResponse.json({
      success: true,
      credito_id: creditoIdParam,
      codigo_credito: credito.codigo_credito,
      pagos: pagosConDistribucion,
      total_pagos: pagos.length
    })

  } catch (error) {
    console.error('Error in pagos GET API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
