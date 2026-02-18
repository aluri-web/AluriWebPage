import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/inversionistas
 *
 * Lista todos los inversionistas del sistema.
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
