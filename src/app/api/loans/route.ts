import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/loans
 *
 * Lista todos los préstamos disponibles para consultar pagos.
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 *
 * DB: creditos + inversiones (for amount_funded calculation)
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
