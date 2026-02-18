import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/schema?table=creditos
 *
 * Obtiene las columnas de una tabla de la base de datos directamente
 * del information_schema de PostgreSQL.
 *
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
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
    const table = searchParams.get('table') || 'creditos'

    // Consultar information_schema para obtener las columnas de la tabla
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { table_name: table })

    if (error) {
      // Si la función RPC no existe, intentar obtener el schema del OpenAPI
      const schemaResponse = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceRoleKey}`)

      if (schemaResponse.ok) {
        const schemaData = await schemaResponse.json()

        // Buscar la definición de la tabla en el schema
        if (schemaData.definitions && schemaData.definitions[table]) {
          const tableDefinition = schemaData.definitions[table]
          const properties = tableDefinition.properties || {}

          const columnList = Object.entries(properties).map(([name, def]: [string, unknown]) => {
            const columnDef = def as { description?: string; type?: string; format?: string; default?: string }
            return {
              name,
              type: columnDef.format || columnDef.type || 'unknown',
              description: columnDef.description || '',
              default: columnDef.default
            }
          }).sort((a, b) => a.name.localeCompare(b.name))

          return NextResponse.json({
            success: true,
            table,
            columns: columnList,
            total: columnList.length
          })
        }
      }

      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener el schema de la tabla',
        hint: error?.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      table,
      columns,
      total: columns?.length || 0
    })

  } catch (error) {
    console.error('Error in schema API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
