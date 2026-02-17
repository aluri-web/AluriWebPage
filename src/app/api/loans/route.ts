import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/loans
 *
 * Lista todos los préstamos disponibles para consultar pagos.
 * Útil para obtener los códigos válidos de préstamos.
 *
 * DB: creditos + inversiones (for amount_funded calculation)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Status mapping: new DB estado → English API status
    const statusMap: Record<string, string> = {
      publicado: 'fundraising',
      activo: 'active',
      finalizado: 'completed',
      mora: 'defaulted'
    }

    const { data: creditos, error } = await supabase
      .from('creditos')
      .select(`
        id,
        codigo_credito,
        estado,
        monto_solicitado,
        owner:profiles!cliente_id (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching loans:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener préstamos' },
        { status: 500 }
      )
    }

    // Calculate amount_funded per credito from inversiones
    const creditoIds = (creditos || []).map(c => c.id)
    let fundedMap: Record<string, number> = {}

    if (creditoIds.length > 0) {
      const { data: inversiones } = await supabase
        .from('inversiones')
        .select('credito_id, monto_invertido, estado')
        .in('credito_id', creditoIds)
        .in('estado', ['activo', 'pendiente'])

      if (inversiones) {
        for (const inv of inversiones) {
          fundedMap[inv.credito_id] = (fundedMap[inv.credito_id] || 0) + (inv.monto_invertido || 0)
        }
      }
    }

    const formattedLoans = (creditos || []).map(credito => {
      const ownerData = credito.owner as unknown as { full_name: string | null } | null
      return {
        id: credito.id,
        code: credito.codigo_credito,
        status: statusMap[credito.estado] || credito.estado,
        amount_requested: credito.monto_solicitado,
        amount_funded: fundedMap[credito.id] || 0,
        owner_name: ownerData?.full_name || 'Sin propietario'
      }
    })

    return NextResponse.json({
      success: true,
      loans: formattedLoans,
      total: creditos?.length || 0
    })

  } catch (error) {
    console.error('Error in loans API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
