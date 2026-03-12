import { NextRequest, NextResponse } from 'next/server'
import { verificarAuth } from '@/lib/api-keys'

/**
 * GET /api/causaciones
 *
 * Obtiene la tabla de causación diaria de intereses para un crédito.
 * Similar a la tabla del Excel de liquidación.
 *
 * Query params:
 * - credito_id: ID o código del crédito (requerido)
 * - limite: número máximo de registros (default: 100)
 *
 * Headers requeridos:
 * - Authorization: Bearer <token> (JWT)
 * - O X-API-Key: <api_key>
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await verificarAuth(request, 'read')
    if (!authResult.success || !authResult.supabase) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 500 }
      )
    }

    const supabase = authResult.supabase
    const { searchParams } = new URL(request.url)
    const creditoIdParam = searchParams.get('credito_id')
    const limite = parseInt(searchParams.get('limite') || '100')

    if (!creditoIdParam) {
      return NextResponse.json(
        { success: false, error: 'Se requiere credito_id' },
        { status: 400 }
      )
    }

    // Buscar el crédito por código o UUID
    let creditoId = creditoIdParam
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creditoIdParam)

    if (!isUUID) {
      // Buscar por código
      const { data: credito, error: errorCredito } = await supabase
        .from('creditos')
        .select('id, codigo_credito, monto_solicitado, tasa_interes_ea, tasa_nominal, fecha_desembolso, saldo_capital, saldo_intereses, saldo_mora')
        .eq('codigo_credito', creditoIdParam.toUpperCase())
        .single()

      if (errorCredito || !credito) {
        return NextResponse.json(
          { success: false, error: `Crédito no encontrado: ${creditoIdParam}` },
          { status: 404 }
        )
      }
      creditoId = credito.id
    }

    // Obtener info básica del crédito
    const { data: creditoInfo } = await supabase
      .from('creditos')
      .select('id, codigo_credito, monto_solicitado, tasa_interes_ea, tasa_nominal, fecha_desembolso, saldo_capital, saldo_capital_esperado, saldo_intereses, saldo_mora, en_mora, dias_mora_actual')
      .eq('id', creditoId)
      .single()

    // Obtener las causaciones diarias
    const { data: causaciones, error: errorCausaciones } = await supabase
      .from('causaciones_diarias')
      .select('*')
      .eq('credito_id', creditoId)
      .order('fecha_causacion', { ascending: true })
      .limit(limite)

    if (errorCausaciones) {
      return NextResponse.json(
        { success: false, error: 'Error al obtener causaciones' },
        { status: 500 }
      )
    }

    // Formatear causaciones para la tabla
    const causacionesFormateadas = (causaciones || []).map((c, index) => ({
      dia: index + 1,
      fecha: c.fecha_causacion,
      capital_esperado: c.capital_esperado,
      capital_real: c.capital_real,
      tasa_diaria: c.tasa_diaria,
      interes_corriente: c.interes_causado,
      interes_moratorio: c.mora_causada,
      interes_moratorio_potencial: c.interes_moratorio_potencial,
      dias_mora: c.dias_mora,
      en_mora: c.en_mora,
      monto_para_colocarse: c.monto_para_colocarse
    }))

    // Calcular totales
    const totales = {
      total_interes_corriente: causaciones?.reduce((sum, c) => sum + (c.interes_causado || 0), 0) || 0,
      total_interes_moratorio: causaciones?.reduce((sum, c) => sum + (c.mora_causada || 0), 0) || 0,
      dias_causados: causaciones?.length || 0
    }

    return NextResponse.json({
      success: true,
      credito: creditoInfo,
      causaciones: causacionesFormateadas,
      totales,
      total_registros: causaciones?.length || 0
    })

  } catch (error) {
    console.error('Error in causaciones API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
