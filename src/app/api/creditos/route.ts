import { NextRequest, NextResponse } from 'next/server'
import { verificarAuth } from '@/lib/api-keys'

/**
 * GET /api/creditos
 *
 * Lista todos los créditos/préstamos disponibles.
 * REQUIERE: Autenticación con rol 'admin' (JWT o API Key)
 *
 * Headers requeridos:
 * - Authorization: Bearer <token> (JWT)
 * - O X-API-Key: <api_key>
 *
 * DB: creditos + inversiones
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verificar autenticación (JWT o API Key)
    const authResult = await verificarAuth(request, 'read')
    if (!authResult.success || !authResult.supabase) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 500 }
      )
    }

    const supabase = authResult.supabase

    // Obtener créditos (sin límite para mostrar todos)
    const { data: creditos, error } = await supabase
      .from('creditos')
      .select(`
        id,
        codigo_credito,
        estado,
        monto_solicitado,
        propietario:profiles!cliente_id (
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching creditos:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener créditos' },
        { status: 500 }
      )
    }

    // Calcular monto_financiado por crédito desde inversiones
    const creditoIds = (creditos || []).map(c => c.id)
    let montoFinanciadoMap: Record<string, number> = {}

    if (creditoIds.length > 0) {
      const { data: inversiones } = await supabase
        .from('inversiones')
        .select('credito_id, monto_invertido, estado')
        .in('credito_id', creditoIds)
        .in('estado', ['activo', 'pendiente'])

      if (inversiones) {
        for (const inv of inversiones) {
          montoFinanciadoMap[inv.credito_id] = (montoFinanciadoMap[inv.credito_id] || 0) + (inv.monto_invertido || 0)
        }
      }
    }

    const creditosFormateados = (creditos || []).map(credito => {
      const propietarioData = credito.propietario as unknown as { full_name: string | null } | null
      return {
        id: credito.id,
        codigo: credito.codigo_credito,
        estado: credito.estado,
        monto_solicitado: credito.monto_solicitado,
        monto_financiado: montoFinanciadoMap[credito.id] || 0,
        nombre_propietario: propietarioData?.full_name || 'Sin propietario'
      }
    })

    return NextResponse.json({
      success: true,
      creditos: creditosFormateados,
      total: creditos?.length || 0
    })

  } catch (error) {
    console.error('Error in creditos API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
