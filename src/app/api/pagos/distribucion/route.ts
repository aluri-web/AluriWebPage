import { NextRequest, NextResponse } from 'next/server'
import { verificarAuth } from '@/lib/api-keys'

/**
 * GET /api/pagos/distribucion?credito_id=uuid
 *
 * Obtiene el resumen de distribución de pagos a inversionistas para un crédito.
 * Muestra cuánto ha recibido cada inversionista en total y cuánto le corresponde
 * por los pagos registrados.
 *
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 * - X-API-Key: <api_key>
 *
 * DB: creditos + inversiones + transacciones
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verificar autenticación
    const authResult = await verificarAuth(request, 'admin')
    if (!authResult.success || !authResult.supabase) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 500 }
      )
    }
    const supabase = authResult.supabase

    // Procesar la solicitud (usuario autenticado como admin)
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

    // Obtener información del crédito
    const { data: credito, error: creditoError } = await supabase
      .from('creditos')
      .select(`
        id,
        codigo_credito,
        monto_solicitado,
        tasa_nominal,
        tasa_interes_ea,
        estado,
        propietario:profiles!cliente_id (
          id,
          full_name,
          document_id
        )
      `)
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

    // Obtener las inversiones activas
    const { data: inversiones, error: invError } = await supabase
      .from('inversiones')
      .select(`
        id,
        inversionista_id,
        monto_invertido,
        interest_rate_investor,
        created_at,
        inversionista:profiles!inversionista_id (
          id,
          full_name,
          email,
          document_id
        )
      `)
      .eq('credito_id', creditoId)
      .eq('estado', 'activo')

    if (invError) {
      console.error('Error fetching inversiones:', invError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener inversiones' },
        { status: 500 }
      )
    }

    // Calcular monto financiado desde inversiones
    const montoFinanciado = (inversiones || []).reduce(
      (sum, inv) => sum + (inv.monto_invertido || 0), 0
    )

    // Obtener transacciones de pago del crédito
    const { data: transacciones, error: txError } = await supabase
      .from('transacciones')
      .select('tipo_transaccion, monto, referencia_pago')
      .eq('credito_id', creditoId)
      .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])

    if (txError) {
      console.error('Error fetching pagos:', txError)
    }

    // Calcular totales de pagos desde transacciones
    const totalesPagos = (transacciones || []).reduce(
      (acc, tx) => {
        const monto = tx.monto || 0
        if (tx.tipo_transaccion === 'pago_capital') {
          acc.capital += monto
        } else if (tx.tipo_transaccion === 'pago_interes') {
          acc.interes += monto
        } else if (tx.tipo_transaccion === 'pago_mora') {
          acc.mora += monto
        }
        acc.total += monto
        return acc
      },
      { capital: 0, interes: 0, mora: 0, total: 0 }
    )

    // Contar pagos únicos por referencia_pago
    const refsUnicas = new Set(
      (transacciones || []).map(tx => tx.referencia_pago).filter(Boolean)
    )
    const cantidadPagos = refsUnicas.size

    // Calcular distribución por inversionista
    const distribucionInversionistas = (inversiones || []).map(inv => {
      const porcentaje = montoCredito > 0
        ? (inv.monto_invertido / montoCredito) * 100
        : 0

      const invData = inv.inversionista as unknown as {
        id: string;
        full_name: string | null;
        email: string | null;
        document_id: string | null
      } | null

      // Calcular lo que le corresponde a este inversionista de los pagos realizados
      const interesGanado = Math.round((totalesPagos.interes * porcentaje) / 100)
      const capitalDevuelto = Math.round((totalesPagos.capital * porcentaje) / 100)
      const totalGanado = interesGanado + capitalDevuelto

      return {
        inversionista_id: inv.inversionista_id,
        nombre_inversionista: invData?.full_name || 'Sin nombre',
        email_inversionista: invData?.email || null,
        documento_inversionista: invData?.document_id || null,
        inversion_id: inv.id,
        monto_invertido: inv.monto_invertido,
        porcentaje: Math.round(porcentaje * 100) / 100,
        fecha_inversion: inv.created_at,
        // Ganancias calculadas
        interes_ganado: interesGanado,
        capital_devuelto: capitalDevuelto,
        total_ganado: totalGanado,
        // ROI calculado
        porcentaje_roi: inv.monto_invertido > 0
          ? ((interesGanado / inv.monto_invertido) * 100).toFixed(2)
          : '0.00'
      }
    })

    const propietarioData = credito.propietario as unknown as {
      id: string;
      full_name: string | null;
      document_id: string | null
    } | null

    return NextResponse.json({
      success: true,
      credito: {
        id: credito.id,
        codigo: credito.codigo_credito,
        monto_solicitado: credito.monto_solicitado,
        monto_financiado: montoFinanciado,
        tasa_nominal: credito.tasa_nominal,
        tasa_ea: credito.tasa_interes_ea,
        estado: credito.estado,
        propietario: {
          id: propietarioData?.id,
          nombre: propietarioData?.full_name,
          documento: propietarioData?.document_id
        }
      },
      resumen_pagos: {
        total_capital_pagado: totalesPagos.capital,
        total_interes_pagado: totalesPagos.interes,
        total_mora: totalesPagos.mora,
        total_pagado: totalesPagos.total,
        cantidad_pagos: cantidadPagos
      },
      inversionistas: distribucionInversionistas,
      cantidad_inversionistas: inversiones?.length || 0
    })

  } catch (error) {
    console.error('Error in distribucion API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
