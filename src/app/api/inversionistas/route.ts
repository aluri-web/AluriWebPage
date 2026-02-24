import { NextRequest, NextResponse } from 'next/server'
import { verificarAuth } from '@/lib/api-keys'

/**
 * GET /api/inversionistas
 *
 * Lista todos los inversionistas del sistema.
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 * - X-API-Key: <api_key>
 *
 * Query params opcionales:
 * - limit: número máximo de resultados (default: 50)
 * - search: buscar por nombre o documento
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')

    let query = supabase
      .from('profiles')
      .select('id, full_name, email, document_id, phone, address, city, verification_status, created_at')
      .eq('role', 'inversionista')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,document_id.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: inversionistas, error } = await query

    if (error) {
      console.error('Error fetching inversionistas:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener inversionistas' },
        { status: 500 }
      )
    }

    // Para cada inversionista, obtener sus inversiones activas
    const inversionistasConInversiones = await Promise.all(
      (inversionistas || []).map(async (inversionista) => {
        const { data: inversiones, error: inversionesError } = await supabase
          .from('inversiones')
          .select('id, credito_id, monto_invertido, estado, created_at')
          .eq('inversionista_id', inversionista.id)
          .order('created_at', { ascending: false })

        const inversionesActivas = (inversiones || []).filter(i => i.estado === 'activo')
        const totalInvertido = inversionesActivas.reduce((sum, i) => sum + (i.monto_invertido || 0), 0)

        return {
          ...inversionista,
          inversiones_count: inversiones?.length || 0,
          inversiones_activas: inversionesActivas.length,
          total_invertido: totalInvertido
        }
      })
    )

    return NextResponse.json({
      success: true,
      inversionistas: inversionistasConInversiones,
      total: inversionistasConInversiones.length
    })

  } catch (error) {
    console.error('Error in inversionistas API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
