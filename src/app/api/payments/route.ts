import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Tipos para la API
interface PaymentRequest {
  loan_id: string
  payment_date: string
  amount_capital: number
  amount_interest: number
  amount_late_fee?: number
}

interface InvestorPayment {
  investor_id: string
  investor_name: string
  percentage: number
  amount_interest: number
  amount_capital: number
  total: number
}

interface PaymentResponse {
  success: boolean
  payment_id?: string
  total_amount: number
  distribution: InvestorPayment[]
  error?: string
}

/**
 * POST /api/payments
 *
 * Registra un pago del propietario y calcula la distribución a los inversionistas.
 *
 * Body:
 * {
 *   "loan_id": "uuid-del-loan" o "LOAN-001" (código),
 *   "payment_date": "2024-01-15",
 *   "amount_capital": 1000000,
 *   "amount_interest": 500000,
 *   "amount_late_fee": 0
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<PaymentResponse>> {
  try {
    const body: PaymentRequest = await request.json()

    // Validaciones
    if (!body.loan_id) {
      return NextResponse.json(
        { success: false, total_amount: 0, distribution: [], error: 'loan_id es requerido' },
        { status: 400 }
      )
    }

    if (!body.payment_date) {
      return NextResponse.json(
        { success: false, total_amount: 0, distribution: [], error: 'payment_date es requerido' },
        { status: 400 }
      )
    }

    const amountCapital = body.amount_capital || 0
    const amountInterest = body.amount_interest || 0
    const amountLateFee = body.amount_late_fee || 0
    const totalAmount = amountCapital + amountInterest + amountLateFee

    if (totalAmount <= 0) {
      return NextResponse.json(
        { success: false, total_amount: 0, distribution: [], error: 'El monto total debe ser mayor a cero' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verificar que el préstamo existe (buscar por ID o por código)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.loan_id)

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, code, owner_id, amount_requested')
      .eq(isUUID ? 'id' : 'code', body.loan_id)
      .single()

    if (loanError || !loan) {
      return NextResponse.json(
        { success: false, total_amount: 0, distribution: [], error: 'Préstamo no encontrado' },
        { status: 404 }
      )
    }

    const loanId = loan.id
    const loanAmount = loan.amount_requested || 0

    // Obtener las inversiones activas para este préstamo
    const { data: investments, error: investmentsError } = await supabase
      .from('investments')
      .select(`
        id,
        investor_id,
        amount_invested,
        investor:profiles!investor_id (
          id,
          full_name,
          email
        )
      `)
      .eq('loan_id', loanId)
      .eq('status', 'active')

    if (investmentsError) {
      console.error('Error fetching investments:', investmentsError)
      return NextResponse.json(
        { success: false, total_amount: 0, distribution: [], error: 'Error al obtener inversiones' },
        { status: 500 }
      )
    }

    // Calcular la distribución a cada inversionista
    const distribution: InvestorPayment[] = (investments || []).map(investment => {
      // Calcular porcentaje basado en monto invertido vs monto total del loan
      const percentage = loanAmount > 0
        ? (investment.amount_invested / loanAmount) * 100
        : 0

      const investorData = investment.investor as unknown as {
        id: string;
        full_name: string | null;
        email: string | null
      } | null

      // Calcular montos proporcionales al porcentaje de participación
      const investorInterest = Math.round((amountInterest * percentage) / 100)
      const investorCapital = Math.round((amountCapital * percentage) / 100)
      const investorTotal = investorInterest + investorCapital

      return {
        investor_id: investment.investor_id,
        investor_name: investorData?.full_name || 'Sin nombre',
        percentage: Math.round(percentage * 100) / 100, // Redondear a 2 decimales
        amount_interest: investorInterest,
        amount_capital: investorCapital,
        total: investorTotal
      }
    })

    // Registrar el pago en la tabla loan_payments
    const { data: payment, error: paymentError } = await supabase
      .from('loan_payments')
      .insert({
        loan_id: loanId,
        payment_date: body.payment_date,
        amount_capital: amountCapital,
        amount_interest: amountInterest,
        amount_late_fee: amountLateFee,
        amount_total: totalAmount
      })
      .select('id')
      .single()

    if (paymentError) {
      console.error('Error registering payment:', paymentError)
      return NextResponse.json(
        { success: false, total_amount: 0, distribution: [], error: 'Error al registrar el pago: ' + paymentError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      total_amount: totalAmount,
      distribution
    })

  } catch (error) {
    console.error('Error in payments API:', error)
    return NextResponse.json(
      { success: false, total_amount: 0, distribution: [], error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/payments?loan_id=uuid
 *
 * Obtiene el historial de pagos de un préstamo con la distribución a inversionistas.
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

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, code, amount_requested')
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

    // Obtener los pagos del préstamo
    const { data: payments, error: paymentsError } = await supabase
      .from('loan_payments')
      .select('id, payment_date, amount_capital, amount_interest, amount_late_fee, amount_total, created_at')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: false })

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener pagos' },
        { status: 500 }
      )
    }

    // Obtener las inversiones para calcular distribución
    const { data: investments } = await supabase
      .from('investments')
      .select(`
        investor_id,
        amount_invested,
        investor:profiles!investor_id (
          full_name
        )
      `)
      .eq('loan_id', loanId)
      .eq('status', 'active')

    // Añadir la distribución calculada a cada pago
    const paymentsWithDistribution = (payments || []).map(payment => {
      const distribution = (investments || []).map(inv => {
        const percentage = loanAmount > 0
          ? (inv.amount_invested / loanAmount) * 100
          : 0
        const invData = inv.investor as unknown as { full_name: string | null } | null

        return {
          investor_id: inv.investor_id,
          investor_name: invData?.full_name || 'Sin nombre',
          percentage: Math.round(percentage * 100) / 100,
          amount_interest: Math.round((payment.amount_interest * percentage) / 100),
          amount_capital: Math.round((payment.amount_capital * percentage) / 100)
        }
      })

      return {
        ...payment,
        distribution
      }
    })

    return NextResponse.json({
      success: true,
      loan_id: loanIdParam,
      loan_code: loan.code,
      payments: paymentsWithDistribution,
      total_payments: payments?.length || 0
    })

  } catch (error) {
    console.error('Error in payments GET API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
