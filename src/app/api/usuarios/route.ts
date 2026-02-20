import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/usuarios
 *
 * Lista todos los usuarios del sistema con su rol y estado.
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 *
 * Query params opcionales:
 * - rol: filtrar por rol (inversionista, propietario, admin)
 * - limite: número máximo de resultados (default: 50)
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
    const rol = searchParams.get('rol')
    const limite = parseInt(searchParams.get('limite') || '50')

    let query = supabase
      .from('profiles')
      .select('id, full_name, email, document_id, phone, address, city, role, verification_status, created_at')
      .order('created_at', { ascending: false })
      .limit(limite)

    if (rol) {
      query = query.eq('role', rol)
    }

    const { data: usuarios, error } = await query

    if (error) {
      console.error('Error fetching usuarios:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener usuarios' },
        { status: 500 }
      )
    }

    // Contar por rol
    const conteoRoles = (usuarios || []).reduce((acc, usuario) => {
      const r = usuario.role || 'sin_rol'
      acc[r] = (acc[r] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      usuarios: usuarios || [],
      total: usuarios?.length || 0,
      por_rol: conteoRoles
    })

  } catch (error) {
    console.error('Error in usuarios API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
