import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/investors/[id]/payments
 *
 * Obtiene todos los pagos recibidos por un inversionista específico.
 * Incluye el detalle de cada préstamo donde tiene inversión.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: investorId } = await params

    if (!investorId) {
      return NextResponse.json(
        { success: false, error: 'ID del inversionista es requerido' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey)

    // Obtener información del inversionista
    const { data: investor, error: investorError } = await supabase
      .from('profiles')
      .select('id, full_name, email, document_id')
      .eq('id', investorId)
      .single()

    if (investorError || !investor) {
      return NextResponse.json(
        { success: false, error: 'Inversionista no encontrado' },
        { status: 404 }
      )
    }

    // Obtener todas las inversiones del inversionista
    const { data: investments, error: investmentsError } = await supabase
      .from('investments')
      .select(`
        id,
        loan_id,
        amount_invested,
        status,
        created_at,
        loan:loans!loan_id (
          id,
          code,
          amount_requested,
          status
        )
      `)
      .eq('investor_id', investorId)

    if (investmentsError) {
      console.error('Error fetching investments:', investmentsError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener inversiones' },
        { status: 500 }
      )
    }

    // Para cada inversión, obtener los pagos del préstamo
    const investmentsWithPayments = await Promise.all(
      (investments || []).map(async (investment) => {
        const loanData = investment.loan as unknown as {
          id: string
          code: string
          amount_requested: number
          status: string
        } | null

        if (!loanData) {
          return {
            investment_id: investment.id,
            loan_id: investment.loan_id,
            loan_code: 'N/A',
            amount_invested: investment.amount_invested,
            percentage: 0,
            payments: [],
            total_earned: 0
          }
        }

        // Calcular porcentaje de participación
        const percentage = loanData.amount_requested > 0
          ? (investment.amount_invested / loanData.amount_requested) * 100
          : 0

        // Obtener pagos del préstamo
        const { data: payments } = await supabase
          .from('loan_payments')
          .select('id, payment_date, amount_capital, amount_interest, amount_late_fee, amount_total')
          .eq('loan_id', investment.loan_id)
          .order('payment_date', { ascending: false })

        // Calcular lo que le corresponde al inversionista de cada pago
        const paymentsWithShare = (payments || []).map(payment => ({
          payment_id: payment.id,
          payment_date: payment.payment_date,
          loan_total: payment.amount_total,
          investor_interest: Math.round((payment.amount_interest * percentage) / 100),
          investor_capital: Math.round((payment.amount_capital * percentage) / 100),
          investor_total: Math.round(((payment.amount_interest + payment.amount_capital) * percentage) / 100)
        }))

        const totalEarned = paymentsWithShare.reduce((sum, p) => sum + p.investor_total, 0)

        return {
          investment_id: investment.id,
          loan_id: investment.loan_id,
          loan_code: loanData.code,
          loan_status: loanData.status,
          amount_invested: investment.amount_invested,
          percentage: Math.round(percentage * 100) / 100,
          payments: paymentsWithShare,
          payments_count: paymentsWithShare.length,
          total_earned: totalEarned
        }
      })
    )

    // Calcular totales generales
    const totalInvested = investmentsWithPayments.reduce((sum, i) => sum + i.amount_invested, 0)
    const totalEarned = investmentsWithPayments.reduce((sum, i) => sum + i.total_earned, 0)
    const totalPayments = investmentsWithPayments.reduce((sum, i) => sum + i.payments_count, 0)

    return NextResponse.json({
      success: true,
      investor: {
        id: investor.id,
        name: investor.full_name,
        email: investor.email,
        document: investor.document_id
      },
      summary: {
        total_invested: totalInvested,
        total_earned: totalEarned,
        total_payments: totalPayments,
        active_investments: investmentsWithPayments.filter(i => i.loan_status === 'active').length
      },
      investments: investmentsWithPayments
    })

  } catch (error) {
    console.error('Error in investor payments API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
