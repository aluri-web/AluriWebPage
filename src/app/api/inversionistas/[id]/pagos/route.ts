import { NextRequest, NextResponse } from 'next/server'
import { verificarAuth } from '@/lib/api-keys'

/**
 * GET /api/inversionistas/[id]/pagos
 *
 * Obtiene todos los pagos recibidos por un inversionista específico.
 * Incluye el detalle de cada crédito donde tiene inversión.
 *
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 * - X-API-Key: <api_key>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: inversionistaId } = await params

    if (!inversionistaId) {
      return NextResponse.json(
        { success: false, error: 'ID del inversionista es requerido' },
        { status: 400 }
      )
    }

    // Verificar autenticación
    const authResult = await verificarAuth(request, 'admin')
    if (!authResult.success || !authResult.supabase) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 500 }
      )
    }
    const supabase = authResult.supabase

    // Procesar la solicitud (usuario autenticado como admin)
    // Obtener información del inversionista
    const { data: inversionista, error: inversionistaError } = await supabase
      .from('profiles')
      .select('id, full_name, email, document_id')
      .eq('id', inversionistaId)
      .single()

    if (inversionistaError || !inversionista) {
      return NextResponse.json(
        { success: false, error: 'Inversionista no encontrado' },
        { status: 404 }
      )
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
      .eq('inversionista_id', inversionistaId)

    if (inversionesError) {
      console.error('Error fetching inversiones:', inversionesError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener inversiones' },
        { status: 500 }
      )
    }

    // Para cada inversión, obtener los pagos del crédito desde transacciones
    const inversionesConPagos = await Promise.all(
      (inversiones || []).map(async (inversion) => {
        const creditoData = inversion.credito as unknown as {
          id: string
          codigo_credito: string
          monto_solicitado: number
          estado: string
        } | null

        if (!creditoData) {
          return {
            inversion_id: inversion.id,
            credito_id: inversion.credito_id,
            codigo_credito: 'N/A',
            monto_invertido: inversion.monto_invertido,
            porcentaje: 0,
            pagos: [],
            total_ganado: 0
          }
        }

        // Calcular porcentaje de participación
        const porcentaje = creditoData.monto_solicitado > 0
          ? (inversion.monto_invertido / creditoData.monto_solicitado) * 100
          : 0

        // Obtener transacciones de pago del crédito
        const { data: transacciones } = await supabase
          .from('transacciones')
          .select('id, tipo_transaccion, monto, fecha_transaccion, referencia_pago')
          .eq('credito_id', inversion.credito_id)
          .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])
          .order('fecha_transaccion', { ascending: false })

        // Agrupar transacciones por referencia_pago
        const gruposPago: Record<string, {
          id: string;
          fecha_pago: string;
          monto_capital: number;
          monto_interes: number;
          monto_mora: number;
          monto_total: number;
        }> = {}

        for (const tx of (transacciones || [])) {
          const ref = tx.referencia_pago || tx.id
          if (!gruposPago[ref]) {
            gruposPago[ref] = {
              id: ref,
              fecha_pago: tx.fecha_transaccion,
              monto_capital: 0,
              monto_interes: 0,
              monto_mora: 0,
              monto_total: 0
            }
          }
          const grupo = gruposPago[ref]
          if (tx.tipo_transaccion === 'pago_capital') grupo.monto_capital += tx.monto || 0
          else if (tx.tipo_transaccion === 'pago_interes') grupo.monto_interes += tx.monto || 0
          else if (tx.tipo_transaccion === 'pago_mora') grupo.monto_mora += tx.monto || 0
          grupo.monto_total = grupo.monto_capital + grupo.monto_interes + grupo.monto_mora
        }

        const pagosAgrupados = Object.values(gruposPago)

        // Calcular lo que le corresponde al inversionista de cada pago
        const pagosConParticipacion = pagosAgrupados.map(pago => ({
          pago_id: pago.id,
          fecha_pago: pago.fecha_pago,
          total_credito: pago.monto_total,
          interes_inversionista: Math.round((pago.monto_interes * porcentaje) / 100),
          capital_inversionista: Math.round((pago.monto_capital * porcentaje) / 100),
          total_inversionista: Math.round(((pago.monto_interes + pago.monto_capital) * porcentaje) / 100)
        }))

        const totalGanado = pagosConParticipacion.reduce((sum, p) => sum + p.total_inversionista, 0)

        return {
          inversion_id: inversion.id,
          credito_id: inversion.credito_id,
          codigo_credito: creditoData.codigo_credito,
          estado_credito: creditoData.estado,
          monto_invertido: inversion.monto_invertido,
          porcentaje: Math.round(porcentaje * 100) / 100,
          pagos: pagosConParticipacion,
          cantidad_pagos: pagosConParticipacion.length,
          total_ganado: totalGanado
        }
      })
    )

    // Calcular totales generales
    const totalInvertido = inversionesConPagos.reduce((sum, i) => sum + i.monto_invertido, 0)
    const totalGanado = inversionesConPagos.reduce((sum, i) => sum + i.total_ganado, 0)
    const totalPagos = inversionesConPagos.reduce((sum, i) => sum + i.cantidad_pagos, 0)

    return NextResponse.json({
      success: true,
      inversionista: {
        id: inversionista.id,
        nombre: inversionista.full_name,
        email: inversionista.email,
        documento: inversionista.document_id
      },
      resumen: {
        total_invertido: totalInvertido,
        total_ganado: totalGanado,
        total_pagos: totalPagos,
        inversiones_activas: inversionesConPagos.filter(i => i.estado_credito === 'activo').length
      },
      inversiones: inversionesConPagos
    })

  } catch (error) {
    console.error('Error in inversionista pagos API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
