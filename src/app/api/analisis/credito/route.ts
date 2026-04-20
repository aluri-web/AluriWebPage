import { NextRequest, NextResponse } from 'next/server'
import { verificarAuth } from '@/lib/api-keys'
import { apiLimiter, getClientIp } from '@/lib/rate-limit'

/**
 * GET /api/analisis/credito
 *
 * Retrieves credito_analyses rows for debugging/auditing the credit agent.
 *
 * Query params (at least one required):
 * - search: applicant_name (ILIKE) or applicant_cedula (eq)
 * - id: analysis UUID (exact match)
 * - lead_id: linked KYC lead UUID
 * - limit: rows to return (default 5, max 20)
 * - only_latest: if "true", returns only the most recent row
 *
 * Requires admin auth. Returns the raw JSONB fields (extracted_data,
 * bank_analysis, etc.) so the full analysis context is visible.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
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
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const id = searchParams.get('id')
    const leadId = searchParams.get('lead_id')
    const onlyLatest = searchParams.get('only_latest') === 'true'
    const rawLimit = parseInt(searchParams.get('limit') || '5', 10)
    const limit = Math.min(Math.max(rawLimit || 5, 1), 20)

    if (!search && !id && !leadId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere uno de: search, id, lead_id' },
        { status: 400 }
      )
    }

    let query = supabase.from('credito_analyses').select('*')

    if (id) {
      query = query.eq('id', id)
    } else if (leadId) {
      query = query.eq('lead_id', leadId)
    } else if (search) {
      // cedula is digits-only, name is text — try both
      const digitsOnly = search.replace(/\D/g, '')
      if (digitsOnly.length >= 4 && digitsOnly === search) {
        query = query.eq('applicant_cedula', digitsOnly)
      } else {
        query = query.ilike('applicant_name', `%${search}%`)
      }
    }

    query = query.order('created_at', { ascending: false }).limit(onlyLatest ? 1 : limit)

    const { data, error } = await query

    if (error) {
      console.error('Error querying credito_analyses:', error.message)
      return NextResponse.json(
        { success: false, error: 'Error consultando análisis', detalle: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      total: data?.length || 0,
      analisis: data || [],
    })
  } catch (error) {
    console.error('Error in /api/analisis/credito:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
