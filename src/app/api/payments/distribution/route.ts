import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/payments/distribution?loan_id=uuid
 *
 * Obtiene el resumen de distribución de pagos a inversionistas para un préstamo.
 * Muestra cuánto ha recibido cada inversionista en total y cuánto le corresponde
 * por los pagos registrados.
 *
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 *
 * DB: creditos + inversiones + transacciones
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return NextResponse.json(
        { success: false, error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    // 1. Verificar autenticación
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere token de autenticación.' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // 2. Verificar el token y obtener el usuario
    const supabaseAuth = createSupabaseClient(supabaseUrl, anonKey)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token inválido o expirado' },
        { status: 401 }
      )
    }

    // 3. Verificar que el usuario sea admin
    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado. Se requiere rol de administrador.' },
        { status: 403 }
      )
    }

    // 4. Procesar la solicitud (usuario autenticado como admin)
    const { searchParams } = new URL(request.url)
    const loanIdParam = searchParams.get('loan_id')

    if (!loanIdParam) {
      return NextResponse.json(
        { success: false, error: 'loan_id es requerido como query parameter' },
        { status: 400 }
      )
    }

    // Buscar el crédito por ID o por codigo_credito
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(loanIdParam)

    // Status mapping: new DB estado → English API status
    const statusMap: Record<string, string> = {
      publicado: 'fundraising',
      activo: 'active',
      finalizado: 'completed',
      mora: 'defaulted'
    }

    // Obtener información del crédito
    const { data: credito, error: creditoError } = await supabase
      .from('creditos')
      .select(`
        id,
        codigo_credito,
        monto_solicitado,
        tasa_nominal,
        tasa_interes_ea,
        estado,
        owner:profiles!cliente_id (
          id,
          full_name,
          document_id
        )
      `)
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

    // Obtener las inversiones activas
    const { data: inversiones, error: invError } = await supabase
      .from('inversiones')
      .select(`
        id,
        inversionista_id,
        monto_invertido,
        interest_rate_investor,
        created_at,
        investor:profiles!inversionista_id (
          id,
          full_name,
          email,
          document_id
        )
      `)
      .eq('credito_id', creditoId)
      .eq('estado', 'activo')

    if (invError) {
      console.error('Error fetching investments:', invError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener inversiones' },
        { status: 500 }
      )
    }

    // Calculate amount_funded from inversiones
    const amountFunded = (inversiones || []).reduce(
      (sum, inv) => sum + (inv.monto_invertido || 0), 0
    )

    // Obtener transacciones de pago del crédito
    const { data: transacciones, error: txError } = await supabase
      .from('transacciones')
      .select('tipo_transaccion, monto, referencia_pago')
      .eq('credito_id', creditoId)
      .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])

    if (txError) {
      console.error('Error fetching payments:', txError)
    }

    // Calcular totales de pagos from transacciones
    const totalPayments = (transacciones || []).reduce(
      (acc, tx) => {
        const monto = tx.monto || 0
        if (tx.tipo_transaccion === 'pago_capital') {
          acc.capital += monto
        } else if (tx.tipo_transaccion === 'pago_interes') {
          acc.interest += monto
        } else if (tx.tipo_transaccion === 'pago_mora') {
          acc.lateFee += monto
        }
        acc.total += monto
        return acc
      },
      { capital: 0, interest: 0, lateFee: 0, total: 0 }
    )

    // Count unique payments by referencia_pago
    const uniqueRefs = new Set(
      (transacciones || []).map(tx => tx.referencia_pago).filter(Boolean)
    )
    const paymentsCount = uniqueRefs.size

    // Calcular distribución por inversionista
    const investorDistribution = (inversiones || []).map(inv => {
      const percentage = loanAmount > 0
        ? (inv.monto_invertido / loanAmount) * 100
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
        investor_id: inv.inversionista_id,
        investor_name: invData?.full_name || 'Sin nombre',
        investor_email: invData?.email || null,
        investor_document: invData?.document_id || null,
        investment_id: inv.id,
        amount_invested: inv.monto_invertido,
        percentage: Math.round(percentage * 100) / 100,
        investment_date: inv.created_at,
        // Ganancias calculadas
        earned_interest: earnedInterest,
        earned_capital_return: earnedCapital,
        total_earned: totalEarned,
        // ROI calculado
        roi_percentage: inv.monto_invertido > 0
          ? ((earnedInterest / inv.monto_invertido) * 100).toFixed(2)
          : '0.00'
      }
    })

    const ownerData = credito.owner as unknown as {
      id: string;
      full_name: string | null;
      document_id: string | null
    } | null

    return NextResponse.json({
      success: true,
      loan: {
        id: credito.id,
        code: credito.codigo_credito,
        amount_requested: credito.monto_solicitado,
        amount_funded: amountFunded,
        interest_rate_nm: credito.tasa_nominal,
        interest_rate_ea: credito.tasa_interes_ea,
        status: statusMap[credito.estado] || credito.estado,
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
        payments_count: paymentsCount
      },
      investors: investorDistribution,
      investors_count: inversiones?.length || 0
    })

  } catch (error) {
    console.error('Error in distribution API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
