import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { ejecutarCausacionDiaria } from '@/lib/interest/calculator'
import type { ResumenEjecucion } from '@/lib/interest/types'
import crypto from 'crypto'

/**
 * POST /api/cron/calcular-intereses
 *
 * Endpoint del cron job que ejecuta la causación diaria de intereses.
 * Calcula los intereses del día para todos los créditos activos y
 * distribuye proporcionalmente a los inversionistas.
 *
 * AUTENTICACIÓN:
 * - Header: Authorization: Bearer <CRON_SECRET>
 * - O bien Vercel lo llama automáticamente con el header correcto
 *
 * EJECUCIÓN:
 * - Vercel Cron: Todos los días a las 5:00 AM UTC (medianoche Colombia)
 * - Manual: curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://aluri.co/api/cron/calcular-intereses
 *
 * RESPUESTA:
 * {
 *   fecha: "2026-02-23",
 *   creditosProcesados: 15,
 *   creditosExitosos: 14,
 *   creditosConError: 1,
 *   totalInteresCausado: 1234567,
 *   totalMoraCausada: 50000,
 *   duracionMs: 2345,
 *   resultados: [...]
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<ResumenEjecucion | { error: string }>> {
  const inicio = Date.now()

  try {
    // 1. Verificar autenticación del cron
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    // Vercel también puede enviar x-vercel-cron-signature
    const vercelCronSignature = request.headers.get('x-vercel-cron-signature')

    if (!cronSecret) {
      console.error('CRON_SECRET no está configurado')
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      )
    }

    // Verificar token Bearer o firma de Vercel
    const bearerToken = authHeader?.replace('Bearer ', '') || ''
    let isAuthorized = false

    // Timing-safe comparison for Bearer token
    if (bearerToken.length === cronSecret.length) {
      isAuthorized = crypto.timingSafeEqual(
        Buffer.from(bearerToken),
        Buffer.from(cronSecret)
      )
    }

    // Vercel cron signature verification
    if (!isAuthorized && vercelCronSignature && cronSecret) {
      try {
        const expectedSignature = crypto
          .createHmac('sha256', cronSecret)
          .update(request.url)
          .digest('hex')
        if (expectedSignature.length === vercelCronSignature.length) {
          isAuthorized = crypto.timingSafeEqual(
            Buffer.from(expectedSignature),
            Buffer.from(vercelCronSignature)
          )
        }
      } catch {
        // Invalid signature format
      }
    }

    if (!isAuthorized) {
      console.warn('Intento no autorizado de ejecutar cron de intereses')
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 2. Configurar cliente Supabase con Service Role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Variables de entorno de Supabase no configuradas' },
        { status: 500 }
      )
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey)

    // 3. Determinar fecha de causación
    // Por defecto: hoy en zona horaria Colombia
    const searchParams = new URL(request.url).searchParams
    const fechaParam = searchParams.get('fecha')

    let fechaCausacion: string
    if (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) {
      fechaCausacion = fechaParam
    } else {
      // Obtener fecha actual en Colombia (UTC-5)
      const now = new Date()
      const colombiaOffset = -5 * 60 // -5 horas en minutos
      const colombiaTime = new Date(now.getTime() + (colombiaOffset - now.getTimezoneOffset()) * 60000)
      fechaCausacion = colombiaTime.toISOString().split('T')[0]
    }

    console.log(`[Cron Intereses] Iniciando causación para fecha: ${fechaCausacion}`)

    // 4. Ejecutar causación diaria
    const resumen = await ejecutarCausacionDiaria(supabase, fechaCausacion)

    // 5. Log de auditoría en la base de datos
    await supabase.from('log_ejecucion_cron').insert({
      fecha: fechaCausacion,
      nombre_job: 'calcular_intereses_diario',
      creditos_procesados: resumen.creditosProcesados,
      creditos_en_mora: resumen.resultados.filter(r => r.moraCausada > 0).length,
      resultado: resumen.creditosConError > 0 ? 'error' : 'exito',
      detalle: JSON.stringify({
        totalIntereses: resumen.totalInteresCausado,
        totalMora: resumen.totalMoraCausada,
        duracionMs: resumen.duracionMs,
        errores: resumen.resultados.filter(r => r.error).map(r => ({
          credito: r.codigoCredito,
          error: r.error
        }))
      })
    })

    console.log(`[Cron Intereses] Completado: ${resumen.creditosExitosos}/${resumen.creditosProcesados} créditos en ${resumen.duracionMs}ms`)
    console.log(`[Cron Intereses] Interés total: $${resumen.totalInteresCausado.toLocaleString()}, Mora total: $${resumen.totalMoraCausada.toLocaleString()}`)

    return NextResponse.json(resumen)

  } catch (error) {
    console.error('[Cron Intereses] Error fatal:', error)

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        fecha: new Date().toISOString().split('T')[0],
        creditosProcesados: 0,
        creditosExitosos: 0,
        creditosConError: 0,
        totalInteresCausado: 0,
        totalMoraCausada: 0,
        duracionMs: Date.now() - inicio,
        resultados: []
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/calcular-intereses
 *
 * Endpoint de información/health check.
 * No ejecuta la causación, solo muestra el estado.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        status: 'error',
        message: 'Variables de entorno no configuradas'
      }, { status: 500 })
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey)

    // Obtener última ejecución
    const { data: ultimaEjecucion } = await supabase
      .from('log_ejecucion_cron')
      .select('*')
      .eq('nombre_job', 'calcular_intereses_diario')
      .order('ejecutado_at', { ascending: false })
      .limit(1)
      .single()

    // Obtener créditos pendientes de procesar hoy
    const hoy = new Date().toISOString().split('T')[0]
    const { count: creditosPendientes } = await supabase
      .from('creditos')
      .select('id', { count: 'exact', head: true })
      .in('estado_credito', ['activo'])
      .gt('saldo_capital', 0)
      .or(`ultima_causacion.is.null,ultima_causacion.lt.${hoy}`)

    return NextResponse.json({
      status: 'ok',
      cron: 'calcular-intereses',
      schedule: '0 5 * * * (5:00 AM UTC / Medianoche Colombia)',
      fecha_actual: hoy,
      creditos_pendientes_hoy: creditosPendientes || 0,
      ultima_ejecucion: ultimaEjecucion ? {
        fecha: ultimaEjecucion.fecha,
        resultado: ultimaEjecucion.resultado,
        creditos_procesados: ultimaEjecucion.creditos_procesados,
        ejecutado_at: ultimaEjecucion.ejecutado_at
      } : null
    })

  } catch (error) {
    console.error('Error en health check:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Error al verificar estado'
    }, { status: 500 })
  }
}
