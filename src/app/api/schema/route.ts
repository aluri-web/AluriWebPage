import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/schema?table=creditos
 *
 * Obtiene las columnas de una tabla de la base de datos directamente
 * del information_schema de PostgreSQL.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table') || 'creditos'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey)

    // Consultar information_schema para obtener las columnas de la tabla
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { table_name: table })

    if (error) {
      // Si la función RPC no existe, intentar consulta directa
      // Usamos una función que debe existir en Supabase
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=0`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Prefer': 'return=representation'
        }
      })

      // Obtener los headers que contienen información del schema
      const contentRange = response.headers.get('content-range')

      // Intentar obtener el schema del OpenAPI
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
