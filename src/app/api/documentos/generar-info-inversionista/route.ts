import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generarInfoInversionista } from '@/lib/documentos/contract/auxiliary'
import type { ChecklistPayload } from '@/lib/documentos/types'

export const runtime = 'nodejs'

async function isAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json() as { payload: ChecklistPayload; acreedor_index: number }
    const { payload, acreedor_index } = body

    if (!payload || !Array.isArray(payload.acreedores) || payload.acreedores.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Payload inválido: se requiere al menos un acreedor' },
        { status: 400 }
      )
    }
    if (typeof acreedor_index !== 'number' || acreedor_index < 0 || acreedor_index >= payload.acreedores.length) {
      return NextResponse.json(
        { ok: false, error: `acreedor_index fuera de rango (0..${payload.acreedores.length - 1})` },
        { status: 400 }
      )
    }

    const { buffer, filename } = generarInfoInversionista(payload, acreedor_index)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
