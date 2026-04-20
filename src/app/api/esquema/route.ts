import { NextRequest, NextResponse } from 'next/server'
import { verificarAuth } from '@/lib/api-keys'

/**
 * GET /api/esquema?tabla=creditos
 *
 * Obtiene las columnas de una tabla de la base de datos directamente
 * del information_schema de PostgreSQL.
 *
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 * - X-API-Key: <api_key>
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
    const ALLOWED_TABLES = [
      'creditos', 'inversiones', 'solicitudes_credito', 'profiles',
      'notificaciones', 'causaciones', 'log_ejecucion_cron', 'pagos',
      'credito_analyses', 'kyc_analyses', 'kyc_leads', 'propietarios'
    ]
    const { searchParams } = new URL(request.url)
    const tabla = searchParams.get('tabla') || 'creditos'

    if (!ALLOWED_TABLES.includes(tabla)) {
      return NextResponse.json(
        { success: false, error: `Tabla '${tabla}' no permitida` },
        { status: 400 }
      )
    }

    // Consultar information_schema para obtener las columnas de la tabla
    const { data: columnas, error } = await supabase
      .rpc('get_table_columns', { table_name: tabla })

    if (error) {
      // Si la función RPC no existe, intentar obtener el schema del OpenAPI
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const schemaResponse = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceRoleKey}`)

      if (schemaResponse.ok) {
        const schemaData = await schemaResponse.json()

        // Buscar la definición de la tabla en el schema
        if (schemaData.definitions && schemaData.definitions[tabla]) {
          const tableDefinition = schemaData.definitions[tabla]
          const properties = tableDefinition.properties || {}

          const listaColumnas = Object.entries(properties).map(([nombre, def]: [string, unknown]) => {
            const columnDef = def as { description?: string; type?: string; format?: string; default?: string }
            return {
              nombre,
              tipo: columnDef.format || columnDef.type || 'desconocido',
              descripcion: columnDef.description || '',
              valor_defecto: columnDef.default
            }
          }).sort((a, b) => a.nombre.localeCompare(b.nombre))

          return NextResponse.json({
            success: true,
            tabla,
            columnas: listaColumnas,
            total: listaColumnas.length
          })
        }
      }

      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener el esquema de la tabla',
        sugerencia: error?.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      tabla,
      columnas,
      total: columnas?.length || 0
    })

  } catch (error) {
    console.error('Error in esquema API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
