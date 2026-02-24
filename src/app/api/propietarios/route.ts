import { NextRequest, NextResponse } from 'next/server'
import { verificarAuth } from '@/lib/api-keys'

/**
 * GET /api/propietarios
 *
 * Lista todos los propietarios (deudores) del sistema.
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
      .eq('role', 'propietario')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,document_id.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: propietarios, error } = await query

    if (error) {
      console.error('Error fetching propietarios:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener propietarios' },
        { status: 500 }
      )
    }

    // Para cada propietario, obtener sus créditos activos
    const propietariosConCreditos = await Promise.all(
      (propietarios || []).map(async (propietario) => {
        const { data: creditos, error: creditosError } = await supabase
          .from('creditos')
          .select('id, codigo_credito, monto_solicitado, valor_colocado, estado, plazo, tasa_nominal')
          .eq('cliente_id', propietario.id)
          .order('created_at', { ascending: false })

        const creditosActivos = (creditos || []).filter(c => c.estado === 'activo')
        const totalDeuda = creditosActivos.reduce((sum, c) => sum + (c.valor_colocado || 0), 0)

        return {
          ...propietario,
          creditos_count: creditos?.length || 0,
          creditos_activos: creditosActivos.length,
          total_deuda: totalDeuda,
          creditos: creditos || []
        }
      })
    )

    return NextResponse.json({
      success: true,
      propietarios: propietariosConCreditos,
      total: propietariosConCreditos.length
    })

  } catch (error) {
    console.error('Error in propietarios API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
