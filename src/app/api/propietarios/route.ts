import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/propietarios
 *
 * Lista todos los propietarios (deudores) del sistema.
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 *
 * Query params opcionales:
 * - limit: número máximo de resultados (default: 50)
 * - search: buscar por nombre o documento
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
