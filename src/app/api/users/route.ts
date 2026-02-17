import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/users
 *
 * Lista todos los usuarios del sistema con su rol y estado.
 * Query params opcionales:
 * - role: filtrar por rol (inversionista, propietario, admin)
 * - limit: número máximo de resultados (default: 50)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey)

    let query = supabase
      .from('profiles')
      .select('id, full_name, email, document_id, phone, address, city, role, verification_status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (role) {
      query = query.eq('role', role)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener usuarios' },
        { status: 500 }
      )
    }

    // Contar por rol
    const roleCounts = (users || []).reduce((acc, user) => {
      const r = user.role || 'sin_rol'
      acc[r] = (acc[r] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      users: users || [],
      total: users?.length || 0,
      by_role: roleCounts
    })

  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
