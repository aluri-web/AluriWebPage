import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/payments/distribution?loan_id=uuid
 *
 * Obtiene el resumen de distribución de pagos a inversionistas para un préstamo.
 * Muestra cuánto ha recibido cada inversionista en total y cuánto le corresponde
 * por los pagos registrados.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const loanIdParam = searchParams.get('loan_id')

    if (!loanIdParam) {
      return NextResponse.json(
        { success: false, error: 'loan_id es requerido como query parameter' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Buscar el préstamo por ID o por código
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(loanIdParam)

    // Obtener información del préstamo
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        code,
        amount_requested,
        amount_funded,
        interest_rate_nm,
        interest_rate_ea,
        status,
        owner:profiles!owner_id (
          id,
          full_name,
          document_id
        )
      `)
      .eq(isUUID ? 'id' : 'code', loanIdParam)
      .single()

    if (loanError || !loan) {
      return NextResponse.json(
        { success: false, error: 'Préstamo no encontrado' },
        { status: 404 }
      )
    }

    const loanId = loan.id
    const loanAmount = loan.amount_requested || 0

    // Obtener las inversiones activas
    const { data: investments, error: invError } = await supabase
      .from('investments')
      .select(`
        id,
        investor_id,
        amount_invested,
        interest_rate_investor,
        created_at,
        investor:profiles!investor_id (
          id,
          full_name,
          email,
          document_id
        )
      `)
      .eq('loan_id', loanId)
      .eq('status', 'active')

    if (invError) {
      console.error('Error fetching investments:', invError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener inversiones' },
        { status: 500 }
      )
    }

    // Obtener el total de pagos del préstamo
    const { data: payments, error: paymentsError } = await supabase
      .from('loan_payments')
      .select('amount_capital, amount_interest, amount_late_fee, amount_total')
      .eq('loan_id', loanId)

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
    }

    // Calcular totales de pagos
    const totalPayments = (payments || []).reduce(
      (acc, p) => ({
        capital: acc.capital + (p.amount_capital || 0),
        interest: acc.interest + (p.amount_interest || 0),
        lateFee: acc.lateFee + (p.amount_late_fee || 0),
        total: acc.total + (p.amount_total || 0)
      }),
      { capital: 0, interest: 0, lateFee: 0, total: 0 }
    )

    // Calcular distribución por inversionista
    const investorDistribution = (investments || []).map(inv => {
      const percentage = loanAmount > 0
        ? (inv.amount_invested / loanAmount) * 100
        : 0

      const invData = inv.investor as unknown as {
        id: string;
        full_name: string | null;
        email: string | null;
        document_id: string | null
      } | null

      // Calcular lo que le corresponde a este inversionista de los pagos realizados
      const earnedInterest = Math.round((totalPayments.interest * percentage) / 100)
      const earnedCapital = Math.round((totalPayments.capital * percentage) / 100)
      const totalEarned = earnedInterest + earnedCapital

      return {
        investor_id: inv.investor_id,
        investor_name: invData?.full_name || 'Sin nombre',
        investor_email: invData?.email || null,
        investor_document: invData?.document_id || null,
        investment_id: inv.id,
        amount_invested: inv.amount_invested,
        percentage: Math.round(percentage * 100) / 100,
        investment_date: inv.created_at,
        // Ganancias calculadas
        earned_interest: earnedInterest,
        earned_capital_return: earnedCapital,
        total_earned: totalEarned,
        // ROI calculado
        roi_percentage: inv.amount_invested > 0
          ? ((earnedInterest / inv.amount_invested) * 100).toFixed(2)
          : '0.00'
      }
    })

    const ownerData = loan.owner as unknown as {
      id: string;
      full_name: string | null;
      document_id: string | null
    } | null

    return NextResponse.json({
      success: true,
      loan: {
        id: loan.id,
        code: loan.code,
        amount_requested: loan.amount_requested,
        amount_funded: loan.amount_funded,
        interest_rate_nm: loan.interest_rate_nm,
        interest_rate_ea: loan.interest_rate_ea,
        status: loan.status,
        owner: {
          id: ownerData?.id,
          name: ownerData?.full_name,
          document: ownerData?.document_id
        }
      },
      payments_summary: {
        total_capital_paid: totalPayments.capital,
        total_interest_paid: totalPayments.interest,
        total_late_fees: totalPayments.lateFee,
        total_amount_paid: totalPayments.total,
        payments_count: payments?.length || 0
      },
      investors: investorDistribution,
      investors_count: investments?.length || 0
    })

  } catch (error) {
    console.error('Error in distribution API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
