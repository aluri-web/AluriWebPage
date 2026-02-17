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
 * DB: creditos + inversiones + transacciones
 *
 * Body:
 * {
 *   "loan_id": "uuid-del-credito" o "CRE-001" (codigo_credito),
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

    // Verificar que el crédito existe (buscar por ID o por codigo_credito)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.loan_id)

    const { data: credito, error: creditoError } = await supabase
      .from('creditos')
      .select('id, codigo_credito, cliente_id, monto_solicitado')
      .eq(isUUID ? 'id' : 'codigo_credito', body.loan_id)
      .single()

    if (creditoError || !credito) {
      return NextResponse.json(
        { success: false, total_amount: 0, distribution: [], error: 'Préstamo no encontrado' },
        { status: 404 }
      )
    }

    const creditoId = credito.id
    const loanAmount = credito.monto_solicitado || 0

    // Obtener las inversiones activas para este crédito
    const { data: inversiones, error: inversionesError } = await supabase
      .from('inversiones')
      .select(`
        id,
        inversionista_id,
        monto_invertido,
        investor:profiles!inversionista_id (
          id,
          full_name,
          email
        )
      `)
      .eq('credito_id', creditoId)
      .eq('estado', 'activo')

    if (inversionesError) {
      console.error('Error fetching investments:', inversionesError)
      return NextResponse.json(
        { success: false, total_amount: 0, distribution: [], error: 'Error al obtener inversiones' },
        { status: 500 }
      )
    }

    // Calcular la distribución a cada inversionista
    const distribution: InvestorPayment[] = (inversiones || []).map(inversion => {
      // Calcular porcentaje basado en monto invertido vs monto total del crédito
      const percentage = loanAmount > 0
        ? (inversion.monto_invertido / loanAmount) * 100
        : 0

      const investorData = inversion.investor as unknown as {
        id: string;
        full_name: string | null;
        email: string | null
      } | null

      // Calcular montos proporcionales al porcentaje de participación
      const investorInterest = Math.round((amountInterest * percentage) / 100)
      const investorCapital = Math.round((amountCapital * percentage) / 100)
      const investorTotal = investorInterest + investorCapital

      return {
        investor_id: inversion.inversionista_id,
        investor_name: investorData?.full_name || 'Sin nombre',
        percentage: Math.round(percentage * 100) / 100, // Redondear a 2 decimales
        amount_interest: investorInterest,
        amount_capital: investorCapital,
        total: investorTotal
      }
    })

    // Registrar el pago en la tabla transacciones (1-3 rows per payment with shared referencia_pago)
    const referenciaPago = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // Build transaction rows for each non-zero amount type
    const transactionRows: {
      credito_id: string;
      tipo_transaccion: string;
      monto: number;
      fecha_transaccion: string;
      referencia_pago: string;
    }[] = []

    if (amountCapital > 0) {
      transactionRows.push({
        credito_id: creditoId,
        tipo_transaccion: 'pago_capital',
        monto: amountCapital,
        fecha_transaccion: body.payment_date,
        referencia_pago: referenciaPago
      })
    }

    if (amountInterest > 0) {
      transactionRows.push({
        credito_id: creditoId,
        tipo_transaccion: 'pago_interes',
        monto: amountInterest,
        fecha_transaccion: body.payment_date,
        referencia_pago: referenciaPago
      })
    }

    if (amountLateFee > 0) {
      transactionRows.push({
        credito_id: creditoId,
        tipo_transaccion: 'pago_mora',
        monto: amountLateFee,
        fecha_transaccion: body.payment_date,
        referencia_pago: referenciaPago
      })
    }

    const { error: txError } = await supabase
      .from('transacciones')
      .insert(transactionRows)

    if (txError) {
      console.error('Error registering payment:', txError)
      return NextResponse.json(
        { success: false, total_amount: 0, distribution: [], error: 'Error al registrar el pago: ' + txError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      payment_id: referenciaPago,
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
 *
 * DB: creditos + transacciones (grouped by referencia_pago) + inversiones
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

    // Buscar el crédito por ID o por codigo_credito
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(loanIdParam)

    const { data: credito, error: creditoError } = await supabase
      .from('creditos')
      .select('id, codigo_credito, monto_solicitado')
      .eq(isUUID ? 'id' : 'codigo_credito', loanIdParam)
      .single()

    if (creditoError || !credito) {
      return NextResponse.json(
        { success: false, error: 'Préstamo no encontrado' },
        { status: 404 }
      )
    }

    const creditoId = credito.id
    const loanAmount = credito.monto_solicitado || 0

    // Obtener las transacciones de pago del crédito
    const { data: transacciones, error: txError } = await supabase
      .from('transacciones')
      .select('id, tipo_transaccion, monto, fecha_transaccion, referencia_pago, created_at')
      .eq('credito_id', creditoId)
      .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])
      .order('fecha_transaccion', { ascending: false })

    if (txError) {
      console.error('Error fetching payments:', txError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener pagos' },
        { status: 500 }
      )
    }

    // Group transacciones by referencia_pago to reconstruct payments
    const paymentGroups: Record<string, {
      id: string;
      payment_date: string;
      amount_capital: number;
      amount_interest: number;
      amount_late_fee: number;
      amount_total: number;
      created_at: string;
    }> = {}

    for (const tx of (transacciones || [])) {
      const ref = tx.referencia_pago || tx.id
      if (!paymentGroups[ref]) {
        paymentGroups[ref] = {
          id: ref,
          payment_date: tx.fecha_transaccion,
          amount_capital: 0,
          amount_interest: 0,
          amount_late_fee: 0,
          amount_total: 0,
          created_at: tx.created_at
        }
      }
      const group = paymentGroups[ref]
      if (tx.tipo_transaccion === 'pago_capital') group.amount_capital += tx.monto || 0
      else if (tx.tipo_transaccion === 'pago_interes') group.amount_interest += tx.monto || 0
      else if (tx.tipo_transaccion === 'pago_mora') group.amount_late_fee += tx.monto || 0
      group.amount_total = group.amount_capital + group.amount_interest + group.amount_late_fee
    }

    const payments = Object.values(paymentGroups)

    // Obtener las inversiones para calcular distribución
    const { data: inversiones } = await supabase
      .from('inversiones')
      .select(`
        inversionista_id,
        monto_invertido,
        investor:profiles!inversionista_id (
          full_name
        )
      `)
      .eq('credito_id', creditoId)
      .eq('estado', 'activo')

    // Añadir la distribución calculada a cada pago
    const paymentsWithDistribution = payments.map(payment => {
      const distribution = (inversiones || []).map(inv => {
        const percentage = loanAmount > 0
          ? (inv.monto_invertido / loanAmount) * 100
          : 0
        const invData = inv.investor as unknown as { full_name: string | null } | null

        return {
          investor_id: inv.inversionista_id,
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
      loan_code: credito.codigo_credito,
      payments: paymentsWithDistribution,
      total_payments: payments.length
    })

  } catch (error) {
    console.error('Error in payments GET API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
