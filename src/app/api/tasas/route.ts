import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/tasas
 *
 * Obtiene las tasas oficiales de la Superintendencia Financiera de Colombia.
 * Este endpoint es público (no requiere autenticación).
 *
 * Query params opcionales:
 * - tipo: 'ibc_consumo' | 'usura_consumo' | 'ibc_microcredito' | 'usura_microcredito'
 * - fecha: YYYY-MM-DD (default: hoy)
 *
 * Respuesta:
 * - tasas: array de tasas vigentes
 * - tasa_mora_diaria: tasa de mora diaria calculada
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)

    const tipo = searchParams.get('tipo')
    const fechaParam = searchParams.get('fecha')
    const fecha = fechaParam || new Date().toISOString().split('T')[0]

    // Query base
    let query = supabase
      .from('tasas_oficiales')
      .select('id, tipo, tasa_ea, vigencia_desde, vigencia_hasta, fuente')
      .lte('vigencia_desde', fecha)
      .gte('vigencia_hasta', fecha)
      .order('vigencia_desde', { ascending: false })

    // Filtrar por tipo si se especifica
    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    const { data: tasas, error } = await query

    if (error) {
      console.error('Error fetching tasas:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener tasas' },
        { status: 500 }
      )
    }

    // Calcular tasa de mora diaria usando la función de PostgreSQL
    const { data: tasaMoraResult } = await supabase
      .rpc('calcular_tasa_mora_diaria', { p_fecha: fecha })

    const tasaMoraDiaria = tasaMoraResult ?? null

    // Obtener tasa de usura vigente para referencia
    const tasaUsura = tasas?.find(t => t.tipo === 'usura_consumo')?.tasa_ea ?? null

    return NextResponse.json({
      success: true,
      fecha_consulta: fecha,
      tasas: tasas || [],
      tasa_usura_ea: tasaUsura,
      tasa_mora_diaria: tasaMoraDiaria,
      tasa_mora_mensual: tasaMoraDiaria ? tasaMoraDiaria * 30 : null,
      fuente: 'Superintendencia Financiera de Colombia'
    })

  } catch (error) {
    console.error('Error in tasas API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
