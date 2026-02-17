import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/loans
 *
 * Lista todos los préstamos disponibles para consultar pagos.
 * Útil para obtener los códigos válidos de préstamos.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    const { data: loans, error } = await supabase
      .from('loans')
      .select(`
        id,
        code,
        status,
        amount_requested,
        amount_funded,
        owner:profiles!owner_id (
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

    const formattedLoans = (loans || []).map(loan => {
      const ownerData = loan.owner as unknown as { full_name: string | null } | null
      return {
        id: loan.id,
        code: loan.code,
        status: loan.status,
        amount_requested: loan.amount_requested,
        amount_funded: loan.amount_funded,
        owner_name: ownerData?.full_name || 'Sin propietario'
      }
    })

    return NextResponse.json({
      success: true,
      loans: formattedLoans,
      total: loans?.length || 0
    })

  } catch (error) {
    console.error('Error in loans API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
