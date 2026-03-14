import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verificarAuth } from '@/lib/api-keys'
import { apiLimiter, getClientIp } from '@/lib/rate-limit'

/**
 * GET /api/usuarios
 *
 * Lista todos los usuarios del sistema con su rol y estado.
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 * - X-API-Key: <api_key>
 *
 * Query params opcionales:
 * - rol: filtrar por rol (inversionista, propietario, admin)
 * - limite: número máximo de resultados (default: 50)
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

    const ip = getClientIp(request)
    const rateCheck = await apiLimiter.check(ip)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiadas solicitudes. Intente más tarde.' },
        { status: 429, headers: apiLimiter.headers(rateCheck) }
      )
    }

    const supabase = authResult.supabase

    // Procesar la solicitud (usuario autenticado como admin)
    const { searchParams } = new URL(request.url)
    const rolSchema = z.enum(['admin', 'propietario', 'inversionista', 'demo']).optional()
    const limiteSchema = z.coerce.number().int().min(1).max(200).default(50)

    const rol = rolSchema.safeParse(searchParams.get('rol') || undefined)
    const limite = limiteSchema.safeParse(searchParams.get('limite') || '50')

    let query = supabase
      .from('profiles')
      .select('id, full_name, email, document_id, phone, address, city, role, verification_status, created_at')
      .order('created_at', { ascending: false })
      .limit(limite.success ? limite.data : 50)

    if (rol.success && rol.data) {
      query = query.eq('role', rol.data)
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
