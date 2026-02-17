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

    // Status mapping: new DB estado → English API status
    const statusMap: Record<string, string> = {
      publicado: 'fundraising',
      activo: 'active',
      finalizado: 'completed',
      mora: 'defaulted'
    }

    const invStatusMap: Record<string, string> = {
      activo: 'active',
      pendiente: 'pending_payment'
    }

    // Obtener todas las inversiones del inversionista
    const { data: inversiones, error: inversionesError } = await supabase
      .from('inversiones')
      .select(`
        id,
        credito_id,
        monto_invertido,
        estado,
        created_at,
        credito:creditos!credito_id (
          id,
          codigo_credito,
          monto_solicitado,
          estado
        )
      `)
      .eq('inversionista_id', investorId)

    if (inversionesError) {
      console.error('Error fetching investments:', inversionesError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener inversiones' },
        { status: 500 }
      )
    }

    // Para cada inversión, obtener los pagos del crédito from transacciones
    const investmentsWithPayments = await Promise.all(
      (inversiones || []).map(async (inversion) => {
        const creditoData = inversion.credito as unknown as {
          id: string
          codigo_credito: string
          monto_solicitado: number
          estado: string
        } | null

        if (!creditoData) {
          return {
            investment_id: inversion.id,
            loan_id: inversion.credito_id,
            loan_code: 'N/A',
            amount_invested: inversion.monto_invertido,
            percentage: 0,
            payments: [],
            total_earned: 0
          }
        }

        // Calcular porcentaje de participación
        const percentage = creditoData.monto_solicitado > 0
          ? (inversion.monto_invertido / creditoData.monto_solicitado) * 100
          : 0

        // Obtener transacciones de pago del crédito
        const { data: transacciones } = await supabase
          .from('transacciones')
          .select('id, tipo_transaccion, monto, fecha_transaccion, referencia_pago')
          .eq('credito_id', inversion.credito_id)
          .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])
          .order('fecha_transaccion', { ascending: false })

        // Group transacciones by referencia_pago to reconstruct payments
        const paymentGroups: Record<string, {
          id: string;
          payment_date: string;
          amount_capital: number;
          amount_interest: number;
          amount_late_fee: number;
          amount_total: number;
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
              amount_total: 0
            }
          }
          const group = paymentGroups[ref]
          if (tx.tipo_transaccion === 'pago_capital') group.amount_capital += tx.monto || 0
          else if (tx.tipo_transaccion === 'pago_interes') group.amount_interest += tx.monto || 0
          else if (tx.tipo_transaccion === 'pago_mora') group.amount_late_fee += tx.monto || 0
          group.amount_total = group.amount_capital + group.amount_interest + group.amount_late_fee
        }

        const groupedPayments = Object.values(paymentGroups)

        // Calcular lo que le corresponde al inversionista de cada pago
        const paymentsWithShare = groupedPayments.map(payment => ({
          payment_id: payment.id,
          payment_date: payment.payment_date,
          loan_total: payment.amount_total,
          investor_interest: Math.round((payment.amount_interest * percentage) / 100),
          investor_capital: Math.round((payment.amount_capital * percentage) / 100),
          investor_total: Math.round(((payment.amount_interest + payment.amount_capital) * percentage) / 100)
        }))

        const totalEarned = paymentsWithShare.reduce((sum, p) => sum + p.investor_total, 0)

        return {
          investment_id: inversion.id,
          loan_id: inversion.credito_id,
          loan_code: creditoData.codigo_credito,
          loan_status: statusMap[creditoData.estado] || creditoData.estado,
          amount_invested: inversion.monto_invertido,
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
