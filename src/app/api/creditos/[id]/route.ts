import { NextRequest, NextResponse } from 'next/server'
import { verificarAuth } from '@/lib/api-keys'

/**
 * GET /api/creditos/[id]
 *
 * Obtiene todos los detalles de un crédito específico.
 *
 * Params:
 * - id: UUID o código del crédito (ej: CR018)
 *
 * Headers requeridos:
 * - Authorization: Bearer <token> (JWT)
 * - O X-API-Key: <api_key>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await verificarAuth(request, 'read')
    if (!authResult.success || !authResult.supabase) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 500 }
      )
    }

    const supabase = authResult.supabase
    const { id: creditoIdParam } = await params

    if (!creditoIdParam) {
      return NextResponse.json(
        { success: false, error: 'Se requiere ID del crédito' },
        { status: 400 }
      )
    }

    // Determinar si es UUID o código
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creditoIdParam)

    // Buscar el crédito
    let query = supabase
      .from('creditos')
      .select(`
        *,
        propietario:profiles!cliente_id (
          id,
          full_name,
          documento,
          email,
          telefono
        )
      `)

    if (isUUID) {
      query = query.eq('id', creditoIdParam)
    } else {
      query = query.eq('codigo_credito', creditoIdParam.toUpperCase())
    }

    const { data: credito, error } = await query.single()

    if (error || !credito) {
      return NextResponse.json(
        { success: false, error: `Crédito no encontrado: ${creditoIdParam}` },
        { status: 404 }
      )
    }

    // Obtener inversiones del crédito
    const { data: inversiones } = await supabase
      .from('inversiones')
      .select(`
        id,
        monto_invertido,
        porcentaje_participacion,
        estado,
        interes_acumulado,
        mora_acumulada,
        fecha_inversion,
        inversionista:profiles!inversionista_id (
          id,
          full_name,
          documento,
          email
        )
      `)
      .eq('credito_id', credito.id)
      .in('estado', ['activo', 'pendiente'])

    // Calcular totales de inversión
    const totalInvertido = inversiones?.reduce((sum, inv) => sum + (inv.monto_invertido || 0), 0) || 0
    const totalInteresAcumulado = inversiones?.reduce((sum, inv) => sum + (inv.interes_acumulado || 0), 0) || 0
    const totalMoraAcumulada = inversiones?.reduce((sum, inv) => sum + (inv.mora_acumulada || 0), 0) || 0

    return NextResponse.json({
      success: true,
      credito: {
        id: credito.id,
        codigo: credito.codigo_credito,
        estado: credito.estado,
        estado_credito: credito.estado_credito,
        // Montos
        monto_solicitado: credito.monto_solicitado,
        monto_financiado: totalInvertido,
        saldo_capital: credito.saldo_capital,
        saldo_capital_esperado: credito.saldo_capital_esperado,
        saldo_intereses: credito.saldo_intereses,
        saldo_mora: credito.saldo_mora,
        // Tasas
        tasa_nominal: credito.tasa_nominal,
        tasa_interes_ea: credito.tasa_interes_ea,
        tasa_mora: credito.tasa_mora,
        // Fechas
        fecha_desembolso: credito.fecha_desembolso,
        fecha_primer_pago: credito.fecha_primer_pago,
        fecha_proximo_pago: credito.fecha_proximo_pago,
        fecha_ultimo_pago: credito.fecha_ultimo_pago,
        ultima_causacion: credito.ultima_causacion,
        // Mora
        en_mora: credito.en_mora,
        dias_mora_actual: credito.dias_mora_actual,
        // Otros
        plazo: credito.plazo,
        monto_pago_esperado: credito.monto_pago_esperado,
        tipo_amortizacion: credito.tipo_amortizacion,
        tipo_liquidacion: credito.tipo_liquidacion,
        interes_acumulado_total: credito.interes_acumulado_total,
        // Propietario
        propietario: credito.propietario,
        // Inmueble
        tipo_inmueble: credito.tipo_inmueble,
        direccion_inmueble: credito.direccion_inmueble,
        ciudad_inmueble: credito.ciudad_inmueble,
        valor_comercial: credito.valor_comercial,
        ltv: credito.ltv
      },
      inversiones: inversiones || [],
      resumen_inversiones: {
        total_invertido: totalInvertido,
        total_interes_acumulado: totalInteresAcumulado,
        total_mora_acumulada: totalMoraAcumulada,
        cantidad_inversionistas: inversiones?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in credito detail API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
